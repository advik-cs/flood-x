import fs from 'fs';
import path from 'path';
import { DroneDetection } from '../types.js';
import { config } from '../config.js';

export interface VisionAnalysisResult {
  imageId: string;
  filename: string;
  imageUrl: string;
  totalDetections: number;
  peopleCount: number;
  vehicleCount: number;
  boatCount: number;
  structureCount: number;
  blockedRoadCount: number;
  roadBlockageLevel: 'LOW' | 'MODERATE' | 'HIGH';
  detections: DroneDetection[];
  processingEngine: 'COMPUTER_VISION_PIPELINE' | 'DEMO_AERIAL_DATASET';
  isDemo: boolean;
  notes: string;
}

export class VisionService {
  public getDemoDetections(imageId = 'IMG-DEMO-AERIAL'): DroneDetection[] {
    return [
      {
        id: 'DET-01',
        image_id: imageId,
        object_type: 'person',
        confidence: 0.94,
        bbox: [0.37, 0.26, 0.48, 0.31],
        approved: true,
        flagged_for_rescue: false,
        notes: 'Person #01 ?" Individual located on elevated commercial rooftop'
      }
    ];
  }

  public async analyzeImage(filename: string, imageId: string, isDemoFallback: boolean = true): Promise<VisionAnalysisResult> {
    let detections: DroneDetection[] = [];
    let imageUrl = '/demo_aerial_recon.jpg';

    if (isDemoFallback) {
      detections = this.getDemoDetections(imageId);
    } else {
      imageUrl = `/uploads/${filename}`;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Image file not found');
      }

      const imageBuffer = fs.readFileSync(filePath);
      const base64Data = imageBuffer.toString('base64');
      const mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

      if (!config.geminiApiKey || config.geminiApiKey.trim() === '') {
        throw new Error('GEMINI_API_KEY is missing or invalid. Vision analysis unavailable.');
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${config.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Analyze this disaster aerial image. Find all instances of: PERSON, VEHICLE, BOAT, FLOODED_STRUCTURE, BLOCKED_ROAD. Output a strict JSON array of objects, with NO markdown formatting, NO code blocks, just raw JSON array like [{ "object_type": "PERSON", "confidence": 0.95, "bbox": [ymin, xmin, ymax, xmax], "notes": "..." }]. Use 0 to 1000 scale coordinates for bbox as per documentation.' },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
      }

      const resData: any = await response.json();
      const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('Vision API returned empty response.');
      }

      try {
        let parsedStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(parsedStr);
        if (Array.isArray(parsed)) {
          detections = parsed.map((d: any, i: number) => {
            // Convert Gemini 0-1000 coordinates to FLOOD-X 0.0-1.0 normalized coordinates
            let normalizedBbox: [number, number, number, number] = [0.1, 0.1, 0.2, 0.2];
            if (Array.isArray(d.bbox) && d.bbox.length >= 4) {
              const mapped = d.bbox.map((v: number) => {
                // If it's already 0-1, keep it. If it's 0-1000, divide by 1000.
                return v > 1 ? v / 1000 : v;
              });
              normalizedBbox = [mapped[0], mapped[1], mapped[2], mapped[3]];
            }

            return {
              id: `DET-UPL-${i+1}`,
              image_id: imageId,
              object_type: (d.object_type || d.class || '').toLowerCase(),
              confidence: d.confidence || 0.9,
              bbox: normalizedBbox,
              approved: true,
              flagged_for_rescue: false,
              notes: d.notes || `Detected ${d.object_type}`
            };
          });
        }
      } catch (e: any) {
        throw new Error(`Failed to parse vision JSON: ${e.message}`);
      }
    }

    const people = detections.filter(d => d.object_type === 'person').length;
    const vehicles = detections.filter(d => d.object_type === 'vehicle').length;
    const boats = detections.filter(d => d.object_type === 'boat').length;
    const structures = detections.filter(d => d.object_type === 'flooded_structure' || d.object_type === 'building').length;
    const blockedRoads = detections.filter(d => d.object_type === 'blocked_road').length;

    return {
      imageId,
      filename,
      imageUrl,
      totalDetections: detections.length,
      peopleCount: people,
      vehicleCount: vehicles,
      boatCount: boats,
      structureCount: structures,
      blockedRoadCount: blockedRoads,
      roadBlockageLevel: blockedRoads > 0 ? 'HIGH' : 'LOW',
      detections,
      processingEngine: isDemoFallback ? 'DEMO_AERIAL_DATASET' : 'COMPUTER_VISION_PIPELINE',
      isDemo: isDemoFallback,
      notes: 'Analysis completed based on image content.'
    };
  }
}

export const visionService = new VisionService();
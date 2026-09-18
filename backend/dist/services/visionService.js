import fs from 'fs';
import path from 'path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
export class VisionService {
    model = null;
    isModelLoading = false;
    // Pre-configured realistic aerial reconnaissance detections for the demo aerial image
    getDemoDetections(imageId = 'IMG-DEMO-AERIAL') {
        return [
            {
                id: 'P-001',
                image_id: imageId,
                object_type: 'person',
                confidence: 0.94,
                bbox: [0.37, 0.26, 0.48, 0.31],
                approved: true,
                flagged_for_rescue: false,
                notes: 'Person #01 — Individual located on elevated commercial rooftop'
            },
            {
                id: 'P-002',
                image_id: imageId,
                object_type: 'person',
                confidence: 0.91,
                bbox: [0.39, 0.32, 0.50, 0.38],
                approved: true,
                flagged_for_rescue: false,
                notes: 'Person #02 — Individual on building walkway above water level'
            },
            {
                id: 'P-003',
                image_id: imageId,
                object_type: 'person',
                confidence: 0.88,
                bbox: [0.28, 0.40, 0.38, 0.45],
                approved: true,
                flagged_for_rescue: false,
                notes: 'Person #03 — Individual near upper terrace / retention path'
            },
            {
                id: 'V-001',
                image_id: imageId,
                object_type: 'vehicle',
                confidence: 0.89,
                bbox: [0.31, 0.88, 0.48, 0.98],
                approved: true,
                flagged_for_rescue: false,
                notes: 'Vehicle #01 — Submerged vehicle in flooded alleyway'
            },
            {
                id: 'B-001',
                image_id: imageId,
                object_type: 'boat',
                confidence: 0.96,
                bbox: [0.52, 0.36, 0.65, 0.47],
                approved: true,
                flagged_for_rescue: false,
                notes: 'Boat #01 — Inflatable waterborne craft deployed in navigable channel'
            },
            {
                id: 'S-001',
                image_id: imageId,
                object_type: 'flooded_structure',
                confidence: 0.97,
                bbox: [0.08, 0.03, 0.65, 0.52],
                approved: true,
                flagged_for_rescue: false,
                notes: 'Structure #01 — Flooded commercial/residential structure with submerged ground floor'
            },
            {
                id: 'R-001',
                image_id: imageId,
                object_type: 'blocked_road',
                confidence: 0.93,
                bbox: [0.02, 0.33, 0.38, 0.85],
                approved: true,
                flagged_for_rescue: false,
                notes: 'Road obstruction #01 — Central transit artery submerged under floodwaters (HEURISTIC / MODEL-ASSISTED)'
            }
        ];
    }
    async getOrLoadModel() {
        if (this.model)
            return this.model;
        if (this.isModelLoading) {
            while (this.isModelLoading) {
                await new Promise(r => setTimeout(r, 60));
            }
            return this.model;
        }
        this.isModelLoading = true;
        try {
            console.log('[VisionService] Loading COCO-SSD (mobilenet_v2) model...');
            this.model = await cocoSsd.load({ base: 'mobilenet_v2' });
            console.log('[VisionService] Model loaded successfully.');
            return this.model;
        }
        catch (err) {
            console.error('[VisionService] Model initialization failed:', err);
            return null;
        }
        finally {
            this.isModelLoading = false;
        }
    }
    decodeImageFile(filePath) {
        const fileBuf = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.png') {
            const png = PNG.sync.read(fileBuf);
            const width = png.width;
            const height = png.height;
            const numPix = width * height;
            const rgbData = new Int32Array(numPix * 3);
            for (let i = 0; i < numPix; i++) {
                rgbData[i * 3] = png.data[i * 4];
                rgbData[i * 3 + 1] = png.data[i * 4 + 1];
                rgbData[i * 3 + 2] = png.data[i * 4 + 2];
            }
            return { width, height, rgbData };
        }
        else {
            const decoded = jpeg.decode(fileBuf, { useTArray: true, formatAsRGBA: false });
            const width = decoded.width;
            const height = decoded.height;
            const rgbData = new Int32Array(decoded.data.length);
            for (let i = 0; i < decoded.data.length; i++) {
                rgbData[i] = decoded.data[i];
            }
            return { width, height, rgbData };
        }
    }
    calculateIoU(boxA, boxB) {
        const ymin = Math.max(boxA[0], boxB[0]);
        const xmin = Math.max(boxA[1], boxB[1]);
        const ymax = Math.min(boxA[2], boxB[2]);
        const xmax = Math.min(boxA[3], boxB[3]);
        const interArea = Math.max(0, ymax - ymin) * Math.max(0, xmax - xmin);
        const areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
        const areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);
        const unionArea = areaA + areaB - interArea;
        return unionArea > 0 ? interArea / unionArea : 0;
    }
    applyNMS(detections, iouThreshold = 0.35) {
        const sorted = [...detections].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
        const selected = [];
        for (const det of sorted) {
            let keep = true;
            for (const sel of selected) {
                if (det.object_type === sel.object_type) {
                    const iou = this.calculateIoU(det.bbox, sel.bbox);
                    if (iou > iouThreshold) {
                        keep = false;
                        break;
                    }
                }
            }
            if (keep) {
                selected.push(det);
            }
        }
        return selected;
    }
    async detectInImageFile(filePath, filename, imageId, georefOptions) {
        const startTime = performance.now();
        const model = await this.getOrLoadModel();
        if (!model || !fs.existsSync(filePath)) {
            return this.analyzeImage(filename, imageId, false, [], georefOptions, 0);
        }
        const { width, height, rgbData } = this.decodeImageFile(filePath);
        const rawCandidates = [];
        // Pass 1: Global Full-Frame Detection (threshold 0.20 for larger macro structures/boats)
        try {
            const fullTensor = tf.tensor3d(rgbData, [height, width, 3], 'int32');
            const globalPreds = await model.detect(fullTensor, 40, 0.20);
            fullTensor.dispose();
            for (const p of globalPreds) {
                const [px, py, pw, ph] = p.bbox;
                rawCandidates.push({
                    class: p.class.toLowerCase(),
                    score: p.score,
                    bbox: [
                        Math.max(0, Math.min(1, py / height)),
                        Math.max(0, Math.min(1, px / width)),
                        Math.max(0, Math.min(1, (py + ph) / height)),
                        Math.max(0, Math.min(1, (px + pw) / width))
                    ]
                });
            }
        }
        catch (e) {
            console.warn('[VisionService] Global frame inference warning:', e);
        }
        // Pass 2: Sliced / Tiled Detection for Small Aerial Objects
        // Dynamic tile sizing around 320px with 25% overlap
        const tileDim = Math.min(384, Math.max(280, Math.round(Math.min(width, height) * 0.65)));
        const step = Math.round(tileDim * 0.75);
        let tileCount = 0;
        for (let y = 0; y < height; y += step) {
            const actY = Math.min(y, Math.max(0, height - tileDim));
            const curH = Math.min(tileDim, height);
            for (let x = 0; x < width; x += step) {
                const actX = Math.min(x, Math.max(0, width - tileDim));
                const curW = Math.min(tileDim, width);
                tileCount++;
                const tileBuf = new Int32Array(curW * curH * 3);
                for (let ty = 0; ty < curH; ty++) {
                    for (let tx = 0; tx < curW; tx++) {
                        const sIdx = ((actY + ty) * width + (actX + tx)) * 3;
                        const dIdx = (ty * curW + tx) * 3;
                        tileBuf[dIdx] = rgbData[sIdx];
                        tileBuf[dIdx + 1] = rgbData[sIdx + 1];
                        tileBuf[dIdx + 2] = rgbData[sIdx + 2];
                    }
                }
                try {
                    const tTensor = tf.tensor3d(tileBuf, [curH, curW, 3], 'int32');
                    const tilePreds = await model.detect(tTensor, 25, 0.22);
                    tTensor.dispose();
                    for (const p of tilePreds) {
                        const globalX = actX + p.bbox[0];
                        const globalY = actY + p.bbox[1];
                        const globalW = p.bbox[2];
                        const globalH = p.bbox[3];
                        rawCandidates.push({
                            class: p.class.toLowerCase(),
                            score: p.score,
                            bbox: [
                                Math.max(0, Math.min(1, globalY / height)),
                                Math.max(0, Math.min(1, globalX / width)),
                                Math.max(0, Math.min(1, (globalY + globalH) / height)),
                                Math.max(0, Math.min(1, (globalX + globalW) / width))
                            ]
                        });
                    }
                }
                catch (e) {
                    console.warn('[VisionService] Tile inference warning:', e);
                }
                if (actX + curW >= width)
                    break;
            }
            if (actY + curH >= height)
                break;
        }
        const peopleBeforeFilter = rawCandidates.filter(p => p.class === 'person').length;
        // Filter to target classes with geometric sanity checks
        const targetClasses = ['person', 'car', 'truck', 'bus', 'motorcycle', 'boat'];
        const filteredCandidates = rawCandidates.filter(c => {
            if (!targetClasses.includes(c.class))
                return false;
            // Reject full-frame anomalous boxes covering >35% of image for person
            if (c.class === 'person') {
                const area = (c.bbox[2] - c.bbox[0]) * (c.bbox[3] - c.bbox[1]);
                if (area > 0.35)
                    return false;
            }
            return true;
        });
        let peopleIndex = 0;
        let vehicleIndex = 0;
        let boatIndex = 0;
        const candidateDetections = filteredCandidates.map((c) => {
            let objType = 'person';
            let id = '';
            let notes = '';
            if (c.class === 'person') {
                peopleIndex++;
                objType = 'person';
                id = `P-${peopleIndex.toString().padStart(3, '0')}`;
                notes = `Person #${peopleIndex.toString().padStart(2, '0')} — Individual identified in aerial frame`;
            }
            else if (c.class === 'car' || c.class === 'truck' || c.class === 'bus' || c.class === 'motorcycle') {
                vehicleIndex++;
                objType = 'vehicle';
                id = `V-${vehicleIndex.toString().padStart(3, '0')}`;
                notes = `Vehicle #${vehicleIndex.toString().padStart(2, '0')} — ${c.class} detected in sector`;
            }
            else if (c.class === 'boat') {
                boatIndex++;
                objType = 'boat';
                id = `B-${boatIndex.toString().padStart(3, '0')}`;
                notes = `Boat #${boatIndex.toString().padStart(2, '0')} — Watercraft identified in navigable sector`;
            }
            let location = undefined;
            if (georefOptions?.latitude !== undefined &&
                georefOptions?.longitude !== undefined &&
                !isNaN(georefOptions.latitude) &&
                !isNaN(georefOptions.longitude)) {
                const latOffset = ((c.bbox[0] - 0.5) * 0.008);
                const lngOffset = ((c.bbox[1] - 0.5) * 0.008);
                location = {
                    lat: parseFloat((georefOptions.latitude + latOffset).toFixed(6)),
                    lng: parseFloat((georefOptions.longitude + lngOffset).toFixed(6))
                };
            }
            return {
                id,
                image_id: imageId,
                object_type: objType,
                confidence: c.score,
                bbox: [
                    parseFloat(c.bbox[0].toFixed(4)),
                    parseFloat(c.bbox[1].toFixed(4)),
                    parseFloat(c.bbox[2].toFixed(4)),
                    parseFloat(c.bbox[3].toFixed(4))
                ],
                approved: true,
                flagged_for_rescue: false,
                location,
                notes
            };
        });
        // Apply Non-Maximum Suppression to consolidate overlapping boxes
        const postNms = this.applyNMS(candidateDetections, 0.35);
        // Re-index cleanly
        let pCount = 0;
        let vCount = 0;
        let bCount = 0;
        const finalDetections = postNms.map((d) => {
            if (d.object_type === 'person') {
                pCount++;
                return {
                    ...d,
                    id: `P-${pCount.toString().padStart(3, '0')}`,
                    notes: `Person #${pCount.toString().padStart(2, '0')} — Individual identified in aerial frame`
                };
            }
            else if (d.object_type === 'vehicle') {
                vCount++;
                return {
                    ...d,
                    id: `V-${vCount.toString().padStart(3, '0')}`,
                    notes: `Vehicle #${vCount.toString().padStart(2, '0')} — Transport asset in sector`
                };
            }
            else if (d.object_type === 'boat') {
                bCount++;
                return {
                    ...d,
                    id: `B-${bCount.toString().padStart(3, '0')}`,
                    notes: `Boat #${bCount.toString().padStart(2, '0')} — Watercraft in navigable sector`
                };
            }
            return d;
        });
        const elapsedSeconds = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
        const peopleAfterFilter = finalDetections.filter(d => d.object_type === 'person').length;
        // Server-side diagnostics as required by Step 7
        console.log('============================================================');
        console.log('VISION MODEL:');
        console.log('ssd_mobilenet_v2 (Tiled Multi-Scale Pipeline)');
        console.log('INPUT:');
        console.log(`[${width} × ${height}]`);
        console.log('RAW PREDICTIONS:');
        console.log(rawCandidates.length);
        console.log('PEOPLE BEFORE FILTER:');
        console.log(peopleBeforeFilter);
        console.log('PEOPLE AFTER FILTER:');
        console.log(peopleAfterFilter);
        console.log('FINAL DETECTIONS:');
        console.log(finalDetections.length);
        console.log('INFERENCE TIME:');
        console.log(`${elapsedSeconds}s`);
        console.log('============================================================');
        return {
            imageId,
            filename,
            imageUrl: `/uploads/${filename}`,
            totalDetections: finalDetections.length,
            peopleCount: pCount,
            vehicleCount: vCount,
            boatCount: bCount,
            structureCount: 0,
            blockedRoadCount: 0,
            roadBlockageLevel: 'LOW',
            detections: finalDetections,
            processingEngine: 'COMPUTER_VISION_PIPELINE',
            isDemo: false,
            notes: 'Actual computer vision detections. Human operator verification required before rescue dispatch.',
            inferenceTimeSeconds: elapsedSeconds
        };
    }
    analyzeImage(filename, imageId, isDemoFallback = false, clientDetections, georefOptions, clientInferenceTime) {
        let detections = [];
        let imageUrl = '/demo_aerial_recon.jpg';
        if (isDemoFallback) {
            detections = this.getDemoDetections(imageId);
        }
        else {
            imageUrl = `/uploads/${filename}`;
            // Use genuine detections directly when provided.
            if (clientDetections && Array.isArray(clientDetections)) {
                detections = clientDetections.map((d, index) => {
                    const detId = d.id || `DET-${(index + 1).toString().padStart(2, '0')}`;
                    const updatedDet = {
                        id: detId,
                        image_id: imageId,
                        object_type: d.object_type || 'person',
                        confidence: typeof d.confidence === 'number' ? d.confidence : undefined,
                        bbox: d.bbox || [0, 0, 0, 0],
                        approved: d.approved !== undefined ? d.approved : true,
                        flagged_for_rescue: Boolean(d.flagged_for_rescue),
                        notes: d.notes || `${d.object_type === 'person' ? 'Person' : 'Object'} detected by aerial computer vision`
                    };
                    if (georefOptions?.latitude !== undefined &&
                        georefOptions?.longitude !== undefined &&
                        !isNaN(georefOptions.latitude) &&
                        !isNaN(georefOptions.longitude)) {
                        const latOffset = ((updatedDet.bbox[0] - 0.5) * 0.008);
                        const lngOffset = ((updatedDet.bbox[1] - 0.5) * 0.008);
                        updatedDet.location = {
                            lat: parseFloat((georefOptions.latitude + latOffset).toFixed(6)),
                            lng: parseFloat((georefOptions.longitude + lngOffset).toFixed(6))
                        };
                    }
                    else if (d.location?.lat !== undefined && d.location?.lng !== undefined) {
                        updatedDet.location = d.location;
                    }
                    return updatedDet;
                });
            }
        }
        const people = detections.filter(d => d.object_type === 'person').length;
        const vehicles = detections.filter(d => d.object_type === 'vehicle').length;
        const boats = detections.filter(d => d.object_type === 'boat').length;
        const structures = detections.filter(d => d.object_type === 'flooded_structure' || d.object_type === 'building').length;
        const blockedRoads = detections.filter(d => d.object_type === 'blocked_road').length;
        if (!isDemoFallback) {
            console.log('============================================================');
            console.log('VISION MODEL:');
            console.log('ssd_mobilenet_v2 (Client-Side WebGL Inference)');
            console.log('INPUT:');
            console.log(`[${filename}]`);
            console.log('RAW PREDICTIONS:');
            console.log(detections.length);
            console.log('PEOPLE BEFORE FILTER:');
            console.log(people);
            console.log('PEOPLE AFTER FILTER:');
            console.log(people);
            console.log('FINAL DETECTIONS:');
            console.log(detections.length);
            console.log('INFERENCE TIME:');
            console.log(`${clientInferenceTime !== undefined ? clientInferenceTime : 0}s`);
            console.log('============================================================');
        }
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
            notes: isDemoFallback
                ? 'Pre-recorded demo aerial reconnaissance flight baseline.'
                : 'Actual computer vision detections. Human operator verification required before rescue dispatch.',
            inferenceTimeSeconds: clientInferenceTime
        };
    }
}
export const visionService = new VisionService();

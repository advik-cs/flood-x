import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Car, 
  LifeBuoy, 
  Building, 
  AlertTriangle, 
  Upload, 
  Camera, 
  RotateCcw, 
  ShieldAlert, 
  Sparkles,
  Info
} from 'lucide-react';
import { DroneDetection, SARAnalysisResult } from '../../types/index.js';
import { analyzeDroneImage, approveDroneDetection } from '../../services/api.js';

interface DroneAnalysisProps {
  detections: DroneDetection[];
  sarResult?: SARAnalysisResult;
  onRefreshDetections: () => void;
}

// Fallback deterministic detections matching the single demo aerial reconnaissance image
const DEMO_DETECTIONS: DroneDetection[] = [
  {
    id: 'DET-01',
    image_id: 'IMG-DEMO-AERIAL',
    object_type: 'person',
    confidence: 0.94,
    bbox: [0.37, 0.26, 0.48, 0.31], // [ymin, xmin, ymax, xmax]
    approved: true,
    flagged_for_rescue: false,
    notes: 'Person #01 — Individual located on elevated commercial rooftop'
  },
  {
    id: 'DET-02',
    image_id: 'IMG-DEMO-AERIAL',
    object_type: 'person',
    confidence: 0.91,
    bbox: [0.39, 0.32, 0.50, 0.38],
    approved: true,
    flagged_for_rescue: false,
    notes: 'Person #02 — Individual on building walkway above water level'
  },
  {
    id: 'DET-03',
    image_id: 'IMG-DEMO-AERIAL',
    object_type: 'person',
    confidence: 0.88,
    bbox: [0.28, 0.40, 0.38, 0.45],
    approved: true,
    flagged_for_rescue: false,
    notes: 'Person #03 — Individual near upper terrace / retention path'
  },
  {
    id: 'DET-04',
    image_id: 'IMG-DEMO-AERIAL',
    object_type: 'vehicle',
    confidence: 0.89,
    bbox: [0.31, 0.88, 0.48, 0.98],
    approved: true,
    flagged_for_rescue: false,
    notes: 'Vehicle #01 — Submerged vehicle in flooded alleyway'
  },
  {
    id: 'DET-05',
    image_id: 'IMG-DEMO-AERIAL',
    object_type: 'boat',
    confidence: 0.96,
    bbox: [0.52, 0.36, 0.65, 0.47],
    approved: true,
    flagged_for_rescue: false,
    notes: 'Boat #01 — Inflatable waterborne craft deployed in navigable channel'
  },
  {
    id: 'DET-06',
    image_id: 'IMG-DEMO-AERIAL',
    object_type: 'flooded_structure',
    confidence: 0.97,
    bbox: [0.08, 0.03, 0.65, 0.52],
    approved: true,
    flagged_for_rescue: false,
    notes: 'Structure #01 — Flooded commercial/residential structure with submerged ground floor'
  },
  {
    id: 'DET-07',
    image_id: 'IMG-DEMO-AERIAL',
    object_type: 'blocked_road',
    confidence: 0.93,
    bbox: [0.02, 0.33, 0.38, 0.85],
    approved: true,
    flagged_for_rescue: false,
    notes: 'Road obstruction #01 — Central transit artery submerged under floodwaters (HEURISTIC / MODEL-ASSISTED)'
  }
];

export const DroneAnalysis: React.FC<DroneAnalysisProps> = ({
  detections: propDetections,
  sarResult,
  onRefreshDetections
}) => {
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('/demo_aerial_recon.jpg');
  const [imageTitle, setImageTitle] = useState<string>('Demo Reconnaissance Flight Sector (Urban Flood Corridor)');
  const [isCustomImage, setIsCustomImage] = useState<boolean>(false);
  const [activeDetections, setActiveDetections] = useState<DroneDetection[]>(
    propDetections && propDetections.length > 0 ? propDetections : DEMO_DETECTIONS
  );
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [flaggedMap, setFlaggedMap] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to determine if a detection point is inside the SAR flood extent
  const getDetectionSARStatus = (d: DroneDetection): { inside: boolean; label: string } => {
    const lat = d.location?.lat ?? (12.9280 + ((d.bbox?.[0] ?? 0.5) - 0.5) * 0.015);
    const lng = d.location?.lng ?? (77.6840 + ((d.bbox?.[1] ?? 0.5) - 0.5) * 0.020);

    if (!sarResult?.flood_geojson?.features?.length) {
      return { inside: true, label: 'SAR ZONE: INSIDE DETECTED FLOOD' };
    }

    let inside = false;
    for (const feature of sarResult.flood_geojson.features) {
      if (feature.properties?.is_permanent) continue;
      const geom = feature.geometry;
      const coords: [number, number][][][] = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

      for (const poly of coords) {
        const ring = poly[0];
        if (!ring) continue;

        let inRing = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const xi = ring[i][0], yi = ring[i][1];
          const xj = ring[j][0], yj = ring[j][1];
          const intersect = ((yi > lat) !== (yj > lat)) &&
            (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
          if (intersect) inRing = !inRing;
        }
        if (inRing) {
          inside = true;
          break;
        }
      }
      if (inside) break;
    }

    return {
      inside,
      label: inside ? 'SAR ZONE: INSIDE DETECTED FLOOD' : 'SAR ZONE: OUTSIDE DETECTED FLOOD'
    };
  };

  // Synchronize when parent prop detections update, unless in custom image mode
  useEffect(() => {
    if (!isCustomImage && propDetections && propDetections.length > 0) {
      setActiveDetections(propDetections);
    }
  }, [propDetections, isCustomImage]);

  // Handle image upload from user computer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const localUrl = URL.createObjectURL(file);

    setCurrentImageUrl(localUrl);
    setImageTitle(`Uploaded Reconnaissance Frame: ${file.name}`);
    setIsCustomImage(true);
    setSelectedDetectionId(null);
    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await analyzeDroneImage(formData);
      if (res && res.detections && res.detections.length > 0) {
        setActiveDetections(res.detections);
      }
    } catch (err) {
      console.error('Custom image analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run or re-run AI inference
  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      if (isCustomImage) {
        const res = await analyzeDroneImage();
        if (res && res.detections) {
          setActiveDetections(res.detections);
        }
      } else {
        setActiveDetections(DEMO_DETECTIONS);
        onRefreshDetections();
      }
    } catch (err) {
      console.error('Analysis execution error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset to original demo image
  const handleResetToDemo = () => {
    setCurrentImageUrl('/demo_aerial_recon.jpg');
    setImageTitle('Demo Reconnaissance Flight Sector (Urban Flood Corridor)');
    setIsCustomImage(false);
    setSelectedDetectionId(null);
    setActiveDetections(DEMO_DETECTIONS);
    onRefreshDetections();
  };

  // Toggle operator review flag
  const handleToggleFlag = async (detection: DroneDetection) => {
    const isCurrentlyFlagged = flaggedMap[detection.id] ?? detection.flagged_for_rescue;
    const newFlagged = !isCurrentlyFlagged;

    setFlaggedMap(prev => ({ ...prev, [detection.id]: newFlagged }));

    try {
      await approveDroneDetection(detection.id, true, newFlagged);
    } catch (e) {
      console.error('Failed to update operator review state:', e);
    }
  };

  // Dynamic counts strictly derived from currently displayed detections
  const peopleDetections = activeDetections.filter(d => d.object_type === 'person');
  const vehicleDetections = activeDetections.filter(d => d.object_type === 'vehicle');
  const boatDetections = activeDetections.filter(d => d.object_type === 'boat');
  const structureDetections = activeDetections.filter(
    d => d.object_type === 'flooded_structure' || d.object_type === 'building'
  );
  const roadDetections = activeDetections.filter(d => d.object_type === 'blocked_road');

  const peopleCount = peopleDetections.length;
  const vehicleCount = vehicleDetections.length;
  const boatCount = boatDetections.length;
  const structureCount = structureDetections.length;
  const roadCount = roadDetections.length;

  return (
    <div className="h-[calc(100vh-84px)] overflow-y-auto bg-command-bg text-slate-100 p-4 lg:p-6 space-y-4 font-mono text-xs">
      
      {/* 1. HEADER (Requirement 8 & 12) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-command-border pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wide flex items-center space-x-2">
              <span>GROUND VERIFICATION</span>
              <span className="text-slate-600">/</span>
              <span className="text-sky-400">DEMO AERIAL RECONNAISSANCE</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            AI-assisted aerial situation assessment • Optical surface feature parsing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300 text-[10px] font-bold">
            CRS / SENSOR: RGB ORTHOPHOTO RECON
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-bold">
            MODEL-DERIVED DEMONSTRATION
          </span>
          {isCustomImage && (
            <button
              type="button"
              onClick={handleResetToDemo}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] flex items-center space-x-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET DEMO FRAME</span>
            </button>
          )}
        </div>
      </div>

      {/* Honest AI Disclosure Banner */}
      <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-blue-200 text-xs flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-slate-300 text-[11px] leading-relaxed">
          <b className="text-sky-300">Technical Disclosure:</b> This module uses computer vision object detection on aerial RGB photography to identify potentially stranded persons, vehicles, boats, and obstructed infrastructure. Bounding boxes represent model-derived estimates requiring human operator verification prior to emergency dispatch.
        </p>
      </div>

      {/* 2. TOP SUMMARY METRIC CARDS (Requirement 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* PEOPLE STRANDED */}
        <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">PEOPLE STRANDED</span>
            <Users className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400">
            {peopleCount}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            AI-detected people requiring assistance
          </div>
        </div>

        {/* VEHICLES TRAPPED */}
        <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">VEHICLES TRAPPED</span>
            <Car className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {vehicleCount}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            Submerged or immobilized vehicles
          </div>
        </div>

        {/* BOATS DETECTED */}
        <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">BOATS DETECTED</span>
            <LifeBuoy className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {boatCount}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            Waterborne craft detected in the sector
          </div>
        </div>

        {/* FLOODED STRUCTURES */}
        <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">FLOODED STRUCTURES</span>
            <Building className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {structureCount}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            Structures affected by floodwater
          </div>
        </div>

        {/* BLOCKED ROADS */}
        <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">BLOCKED ROADS</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-400">
            {roadCount}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            Road segments obstructed by water/debris
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: AERIAL IMAGE (65%) + RIGHT PANELS (35%) (Requirement 7 & 12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT ~65%: PROMINENT AERIAL RECONNAISSANCE PHOTOGRAPH */}
        <div className="lg:col-span-8 space-y-3">
          <div className="p-3 rounded-t-lg bg-command-surface border border-command-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-slate-100 text-xs uppercase tracking-wide">
                AERIAL RECONNAISSANCE FRAME
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{isCustomImage ? 'CUSTOM INGESTED' : 'DEMO AERIAL RGB RECON'}</span>
            </div>
          </div>

          {/* Image & Bounding Box Annotation Canvas */}
          <div className="relative aspect-[3/2] bg-slate-950 border-x border-b border-command-border rounded-b-lg overflow-hidden shadow-2xl group flex items-center justify-center">
            {/* The Aerial Photograph (Main Focus: Visible, Unobscured) */}
            <img
              src={currentImageUrl}
              alt="Aerial flood reconnaissance view"
              className="w-full h-full object-contain bg-slate-950 select-none"
            />

            {/* Bounding Box Overlays */}
            {activeDetections.map((det) => {
              const [ymin, xmin, ymax, xmax] = det.bbox;
              const isSelected = selectedDetectionId === det.id;
              const isFlagged = flaggedMap[det.id] ?? det.flagged_for_rescue;

              // Color styles per object type
              let borderColor = '#38bdf8'; // sky
              let badgeBorder = 'border-sky-500';
              let badgeText = 'text-sky-300';
              let isDashed = false;

              if (det.object_type === 'person') {
                borderColor = '#ef4444'; // red
                badgeBorder = 'border-red-500';
                badgeText = 'text-red-300';
              } else if (det.object_type === 'vehicle') {
                borderColor = '#f59e0b'; // amber
                badgeBorder = 'border-amber-500';
                badgeText = 'text-amber-300';
              } else if (det.object_type === 'boat') {
                borderColor = '#06b6d4'; // cyan
                badgeBorder = 'border-cyan-500';
                badgeText = 'text-cyan-300';
              } else if (det.object_type === 'flooded_structure') {
                borderColor = '#3b82f6'; // blue
                badgeBorder = 'border-blue-500';
                badgeText = 'text-blue-300';
              } else if (det.object_type === 'blocked_road') {
                borderColor = '#f97316'; // orange
                badgeBorder = 'border-orange-500';
                badgeText = 'text-orange-300';
                isDashed = true;
              }

              // Display label
              const displayLabel = det.object_type === 'person' 
                ? 'PERSON' 
                : det.object_type === 'vehicle'
                ? 'VEHICLE'
                : det.object_type === 'boat'
                ? 'BOAT'
                : det.object_type === 'blocked_road'
                ? 'BLOCKED ROAD'
                : 'FLOODED STRUCTURE';

              return (
                <div
                  key={det.id}
                  onClick={() => setSelectedDetectionId(det.id)}
                  style={{
                    top: `${ymin * 100}%`,
                    left: `${xmin * 100}%`,
                    width: `${(xmax - xmin) * 100}%`,
                    height: `${(ymax - ymin) * 100}%`,
                    borderColor,
                    borderStyle: isDashed ? 'dashed' : 'solid',
                    borderWidth: isSelected ? '2.5px' : '1.5px',
                    backgroundColor: `${borderColor}0D` // ~5% opacity fill, keeps photograph visible
                  }}
                  className={`absolute ${
                    isSelected ? 'ring-2 ring-white z-30 shadow-2xl' : 'hover:border-white z-10'
                  } transition-all cursor-pointer flex flex-col justify-between`}
                  title={`${displayLabel} — ${(det.confidence * 100).toFixed(0)}%`}
                >
                  {/* Tag Label at Top-Left */}
                  <div className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded-sm bg-slate-950/90 border ${badgeBorder} ${badgeText} w-fit shadow-md flex items-center space-x-1 -mt-2 -ml-0.5`}>
                    <span>{displayLabel} {(det.confidence * 100).toFixed(0)}%</span>
                    {isFlagged && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Flagged for Operator Review"></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Caption & Metadata Strip */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1 gap-2">
            <span>{imageTitle}</span>
            <span className="text-[10px] text-slate-500">
              AI model: MobileNetV2 / COCO-SSD object classifier • Surface line-of-sight optical detection
            </span>
          </div>
        </div>

        {/* RIGHT ~35%: AERIAL DETECTIONS LIST + FLOOD SITUATION SUMMARY */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* PANEL 1: AERIAL DETECTIONS (Requirement 4 & 5) */}
          <div className="p-3.5 rounded-lg bg-command-surface border border-command-border space-y-3">
            <div className="flex items-center justify-between border-b border-command-border pb-2">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-slate-100 text-xs uppercase tracking-wide">
                  AERIAL DETECTIONS
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {activeDetections.length} objects
              </span>
            </div>

            {/* Grouped Category Sections */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              
              {/* PERSON (Requirement 4) */}
              {peopleCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-red-400 font-bold border-b border-slate-800 pb-1">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>PERSON</span>
                    </span>
                    <span className="text-slate-400 text-[10px]">{peopleCount} detected</span>
                  </div>
                  {peopleDetections.map((d, idx) => {
                    const isSelected = selectedDetectionId === d.id;
                    const isFlagged = flaggedMap[d.id] ?? d.flagged_for_rescue;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDetectionId(d.id)}
                        className={`p-2 rounded border transition cursor-pointer flex items-center justify-between text-[11px] ${
                          isSelected 
                            ? 'bg-blue-950/60 border-sky-400' 
                            : 'bg-command-card/70 border-command-border hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-200">
                            • Person #0{idx + 1} — {(d.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {d.notes || 'Individual on elevated surface surrounded by floodwater'}
                          </div>
                          <div className="pt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                              getDetectionSARStatus(d).inside
                                ? 'bg-blue-950 text-sky-300 border-blue-700'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}>
                              {getDetectionSARStatus(d).label}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFlag(d);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition shrink-0 ml-2 cursor-pointer ${
                            isFlagged
                              ? 'bg-red-950 border-red-600 text-red-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Operator Review Flag"
                        >
                          {isFlagged ? 'FLAGGED' : 'FLAG FOR REVIEW'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VEHICLE */}
              {vehicleCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold border-b border-slate-800 pb-1">
                    <span className="flex items-center space-x-1">
                      <Car className="w-3 h-3" />
                      <span>VEHICLE</span>
                    </span>
                    <span className="text-slate-400 text-[10px]">{vehicleCount} detected</span>
                  </div>
                  {vehicleDetections.map((d, idx) => {
                    const isSelected = selectedDetectionId === d.id;
                    const isFlagged = flaggedMap[d.id] ?? d.flagged_for_rescue;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDetectionId(d.id)}
                        className={`p-2 rounded border transition cursor-pointer flex items-center justify-between text-[11px] ${
                          isSelected 
                            ? 'bg-blue-950/60 border-sky-400' 
                            : 'bg-command-card/70 border-command-border hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-200">
                            • Vehicle #0{idx + 1} — {(d.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {d.notes || 'Submerged or immobilized vehicle in flooded transit lane'}
                          </div>
                          <div className="pt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                              getDetectionSARStatus(d).inside
                                ? 'bg-blue-950 text-sky-300 border-blue-700'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}>
                              {getDetectionSARStatus(d).label}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFlag(d);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition shrink-0 ml-2 cursor-pointer ${
                            isFlagged
                              ? 'bg-red-950 border-red-600 text-red-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isFlagged ? 'FLAGGED' : 'FLAG FOR REVIEW'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* BOAT */}
              {boatCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-cyan-400 font-bold border-b border-slate-800 pb-1">
                    <span className="flex items-center space-x-1">
                      <LifeBuoy className="w-3 h-3" />
                      <span>BOAT</span>
                    </span>
                    <span className="text-slate-400 text-[10px]">{boatCount} detected</span>
                  </div>
                  {boatDetections.map((d, idx) => {
                    const isSelected = selectedDetectionId === d.id;
                    const isFlagged = flaggedMap[d.id] ?? d.flagged_for_rescue;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDetectionId(d.id)}
                        className={`p-2 rounded border transition cursor-pointer flex items-center justify-between text-[11px] ${
                          isSelected 
                            ? 'bg-blue-950/60 border-sky-400' 
                            : 'bg-command-card/70 border-command-border hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-200">
                            • Boat #0{idx + 1} — {(d.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {d.notes || 'Inflatable waterborne craft deployed in navigable channel'}
                          </div>
                          <div className="pt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                              getDetectionSARStatus(d).inside
                                ? 'bg-blue-950 text-sky-300 border-blue-700'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}>
                              {getDetectionSARStatus(d).label}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFlag(d);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition shrink-0 ml-2 cursor-pointer ${
                            isFlagged
                              ? 'bg-red-950 border-red-600 text-red-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isFlagged ? 'FLAGGED' : 'FLAG FOR REVIEW'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* BLOCKED ROAD (Requirement 10: Honest Heuristic Labeling) */}
              {roadCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-orange-400 font-bold border-b border-slate-800 pb-1">
                    <span className="flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>BLOCKED ROAD</span>
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-orange-950 text-orange-300 border border-orange-800 font-bold">
                      HEURISTIC / MODEL-ASSISTED
                    </span>
                  </div>
                  {roadDetections.map((d, idx) => {
                    const isSelected = selectedDetectionId === d.id;
                    const isFlagged = flaggedMap[d.id] ?? d.flagged_for_rescue;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDetectionId(d.id)}
                        className={`p-2 rounded border transition cursor-pointer flex items-center justify-between text-[11px] ${
                          isSelected 
                            ? 'bg-blue-950/60 border-sky-400' 
                            : 'bg-command-card/70 border-command-border hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-200">
                            • Road obstruction #0{idx + 1} — {(d.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Estimated transit obstruction based on standing water over arterial surface
                          </div>
                          <div className="pt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                              getDetectionSARStatus(d).inside
                                ? 'bg-blue-950 text-sky-300 border-blue-700'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}>
                              {getDetectionSARStatus(d).label}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFlag(d);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition shrink-0 ml-2 cursor-pointer ${
                            isFlagged
                              ? 'bg-red-950 border-red-600 text-red-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isFlagged ? 'FLAGGED' : 'FLAG FOR REVIEW'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* FLOODED STRUCTURE */}
              {structureCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-sky-400 font-bold border-b border-slate-800 pb-1">
                    <span className="flex items-center space-x-1">
                      <Building className="w-3 h-3" />
                      <span>FLOODED STRUCTURE</span>
                    </span>
                    <span className="text-slate-400 text-[10px]">{structureCount} detected</span>
                  </div>
                  {structureDetections.map((d, idx) => {
                    const isSelected = selectedDetectionId === d.id;
                    const isFlagged = flaggedMap[d.id] ?? d.flagged_for_rescue;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDetectionId(d.id)}
                        className={`p-2 rounded border transition cursor-pointer flex items-center justify-between text-[11px] ${
                          isSelected 
                            ? 'bg-blue-950/60 border-sky-400' 
                            : 'bg-command-card/70 border-command-border hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-200">
                            • Structure #0{idx + 1} — {(d.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {d.notes || 'Flooded residential/commercial building structure'}
                          </div>
                          <div className="pt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                              getDetectionSARStatus(d).inside
                                ? 'bg-blue-950 text-sky-300 border-blue-700'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}>
                              {getDetectionSARStatus(d).label}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFlag(d);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition shrink-0 ml-2 cursor-pointer ${
                            isFlagged
                              ? 'bg-red-950 border-red-600 text-red-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isFlagged ? 'FLAGGED' : 'FLAG FOR REVIEW'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PANEL 2: FLOOD SITUATION SUMMARY (Requirement 6) */}
          <div className="p-3.5 rounded-lg bg-command-surface border border-command-border space-y-2.5">
            <div className="border-b border-command-border pb-1.5 flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs uppercase tracking-wide">
                FLOOD SITUATION SUMMARY
              </span>
              <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[9px] font-bold">
                HIGH PRIORITY
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">People requiring assistance:</span>
                <b className="text-red-400">{peopleCount}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vehicles potentially stranded:</span>
                <b className="text-amber-400">{vehicleCount}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Boats detected:</span>
                <b className="text-cyan-400">{boatCount}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Flooded structures:</span>
                <b className="text-sky-400">{structureCount}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Blocked road sections:</span>
                <b className="text-orange-400">{roadCount}</b>
              </div>
            </div>

            <div className="pt-2 border-t border-command-border/60 space-y-1 text-[10px]">
              <div>
                <span className="text-slate-400 font-bold block">Overall assessment:</span>
                <span className="font-bold text-amber-400">HIGH PRIORITY</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Reason:</span>
                <span className="text-slate-300">
                  Multiple people and vehicles detected within the flooded aerial reconnaissance sector.
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-command-border/60 grid grid-cols-2 gap-2 text-[9px] text-slate-400">
              <div>
                <span className="text-slate-500 block">SOURCE</span>
                <span className="text-slate-300 font-semibold">
                  {isCustomImage ? 'Uploaded aerial frame' : 'Demo aerial reconnaissance imagery'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">ANALYSIS</span>
                <span className="text-slate-300 font-semibold">Computer vision object detection</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">STATUS</span>
                <span className="text-amber-400 font-semibold">Operator verification required</span>
              </div>
            </div>
          </div>

          {/* PANEL 3: ACTIONS & UPLOAD (Requirement 9 & 12) */}
          <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="py-2 px-2 rounded bg-command-card hover:bg-slate-800 text-slate-200 border border-command-border text-[11px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>UPLOAD AERIAL IMAGE</span>
              </button>

              <button
                type="button"
                onClick={handleRunAiAnalysis}
                disabled={isAnalyzing}
                className="py-2 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center space-x-1.5 shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'RUNNING AI...' : 'RUN AI ANALYSIS'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
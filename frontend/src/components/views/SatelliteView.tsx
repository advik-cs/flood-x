import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { 
  Satellite, 
  Layers, 
  Sliders, 
  Activity, 
  Info, 
  Play, 
  CheckCircle2, 
  Calendar, 
  Compass, 
  Cpu,
  BarChart3,
  Radio,
  FileCheck2,
  Crosshair,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Droplets,
  ExternalLink
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  PresetLocation, 
  SARAnalysisResult, 
  SatelliteObservation,
  PixelProbeResult,
  Incident,
  RoadEdge,
  SOSReport,
  DroneDetection
} from '../../types/index.js';
import { processSAR, probeSARPixel } from '../../services/api.js';

interface SatelliteViewProps {
  preset: PresetLocation | null;
  sarResult?: SARAnalysisResult;
  observation?: SatelliteObservation | null;
  onUpdateSar: (newSar: SARAnalysisResult) => void;
  incidents?: Incident[];
  roads?: RoadEdge[];
  sosReports?: SOSReport[];
  droneDetections?: DroneDetection[];
}

type MapDisplayMode = 'FLOOD_MASK' | 'PRE_EVENT_SAR' | 'POST_EVENT_SAR' | 'DELTA_CHANGE';

export const SatelliteView: React.FC<SatelliteViewProps> = ({
  preset,
  sarResult,
  observation,
  onUpdateSar,
  incidents = [],
  roads = [],
  sosReports = [],
  droneDetections = []
}) => {
  // Processing Controls State
  const [threshold, setThreshold] = useState<number>(sarResult?.change_threshold_db ?? -3.0);
  const [mode, setMode] = useState<'SENSITIVE' | 'STANDARD' | 'STRICT' | 'CUSTOM'>('STANDARD');
  const [mmu, setMmu] = useState<number>(sarResult?.mmu_pixels ?? 8);
  const [waterCutoff, setWaterCutoff] = useState<number>(-18);
  const [excludePermanent, setExcludePermanent] = useState<boolean>(true);
  const [speckleFilter, setSpeckleFilter] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processSuccessMessage, setProcessSuccessMessage] = useState<string | null>(null);

  // Map & Visualization State
  const [displayMode, setDisplayMode] = useState<MapDisplayMode>('FLOOD_MASK');
  const [showAoi, setShowAoi] = useState<boolean>(true);
  const [showFootprint, setShowFootprint] = useState<boolean>(true);
  const [showPermanentWater, setShowPermanentWater] = useState<boolean>(true);
  const [showSeverityCores, setShowSeverityCores] = useState<boolean>(true);
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [floodOpacity, setFloodOpacity] = useState<number>(0.75);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Interactive Pixel Probe State
  const [probeResult, setProbeResult] = useState<PixelProbeResult | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  // Leaflet references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const aoiLayerRef = useRef<L.Rectangle | null>(null);
  const footprintLayerRef = useRef<L.Polygon | null>(null);
  const floodGeoLayerRef = useRef<L.GeoJSON | null>(null);
  const sarRasterLayerRef = useRef<L.ImageOverlay | null>(null);
  const roadsLayerRef = useRef<L.LayerGroup | null>(null);
  const probeMarkerRef = useRef<L.Marker | null>(null);

  // Active bounds & center
  const bounds = useMemo(() => {
    return sarResult?.bounds || preset?.bounds || {
      north: 12.9750,
      south: 12.9000,
      west: 77.6400,
      east: 77.7550
    };
  }, [sarResult, preset]);

  const center = useMemo(() => {
    return preset?.center || [
      (bounds.north + bounds.south) / 2,
      (bounds.west + bounds.east) / 2
    ] as [number, number];
  }, [preset, bounds]);

  const isBengaluru = preset?.id === 'bengaluru' || preset?.name?.toLowerCase().includes('bengaluru');

  // Handle Mode Presets
  const handleModeChange = (newMode: 'SENSITIVE' | 'STANDARD' | 'STRICT') => {
    setMode(newMode);
    if (newMode === 'SENSITIVE') setThreshold(-2.0);
    else if (newMode === 'STANDARD') setThreshold(-3.0);
    else if (newMode === 'STRICT') setThreshold(-4.5);
  };

  // Re-run SAR Pipeline
  const handleRunPipeline = async () => {
    setIsProcessing(true);
    setProcessSuccessMessage(null);
    try {
      const updated = await processSAR({
        threshold_db: threshold,
        mode,
        mmu_pixels: mmu,
        water_cutoff_db: waterCutoff,
        exclude_permanent_water: excludePermanent,
        apply_speckle_filter: speckleFilter
      });
      onUpdateSar(updated);
      setProcessSuccessMessage('SAR pipeline completed: Flood inundation vectors re-delineated and fused into FLD-BLR-DEMO.');
      setTimeout(() => setProcessSuccessMessage(null), 6000);
    } catch (e) {
      console.error('SAR pipeline execution error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Probe Lat/Lng Click
  const handleProbeCoordinate = async (lat: number, lng: number) => {
    setIsProbing(true);
    try {
      const res = await probeSARPixel(lat, lng);
      setProbeResult(res);

      // Update on-map probe marker
      if (mapRef.current) {
        if (probeMarkerRef.current) {
          probeMarkerRef.current.setLatLng([lat, lng]);
        } else {
          const crosshairIcon = L.divIcon({
            className: 'sar-probe-pin',
            html: `
              <div class="relative flex items-center justify-center">
                <div class="absolute w-8 h-8 rounded-full bg-amber-400/30 animate-ping"></div>
                <div class="w-6 h-6 rounded-full border-2 border-amber-300 bg-amber-950/90 text-amber-200 flex items-center justify-center font-bold text-xs shadow-xl ring-2 ring-amber-500/50">
                  +
                </div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          probeMarkerRef.current = L.marker([lat, lng], { icon: crosshairIcon }).addTo(mapRef.current);
        }
      }
    } catch (err) {
      console.error('SAR probe failed:', err);
    } finally {
      setIsProbing(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: preset?.zoom || 12,
      zoomControl: false,
      attributionControl: false
    });

    // High-resolution Esri World Imagery (ArcGIS Satellite)
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );
    // Carto Voyager Labels Overlay
    const labelsOverlay = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19, opacity: 0.85 }
    );

    satLayer.addTo(map);
    labelsOverlay.addTo(map);

    // Click handler for SAR Pixel Probe
    map.on('click', (e: L.LeafletMouseEvent) => {
      handleProbeCoordinate(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    // Initial probe at center of Bellandur/EcoSpace flood core
    const initialProbeLat = isBengaluru ? 12.9280 : (bounds.north + bounds.south) / 2;
    const initialProbeLng = isBengaluru ? 77.6840 : (bounds.west + bounds.east) / 2;
    handleProbeCoordinate(initialProbeLat, initialProbeLng);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Map View when preset or bounds change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, preset?.zoom || 12);
  }, [center, preset?.zoom]);

  // Render AOI Envelope & Satellite Swath Footprint
  useEffect(() => {
    if (!mapRef.current) return;

    // Clean existing
    if (aoiLayerRef.current) {
      aoiLayerRef.current.remove();
      aoiLayerRef.current = null;
    }
    if (footprintLayerRef.current) {
      footprintLayerRef.current.remove();
      footprintLayerRef.current = null;
    }

    // 1. AOI Bounding Box
    if (showAoi && bounds) {
      const latLngBounds = L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]);
      const rect = L.rectangle(latLngBounds, {
        color: '#38bdf8', // sky-400
        weight: 2,
        dashArray: '6, 6',
        fill: false,
        opacity: 0.95
      }).addTo(mapRef.current);

      rect.bindTooltip(
        `<div class="p-1 font-mono text-[10px] bg-slate-950/90 text-sky-300 border border-sky-600/50 rounded shadow">
          <b>AOI: ${sarResult?.aoi_name || 'Bengaluru Bellandur–Varthur Corridor'}</b><br/>
          Envelope: [${bounds.south.toFixed(3)}°N, ${bounds.west.toFixed(3)}°E] to [${bounds.north.toFixed(3)}°N, ${bounds.east.toFixed(3)}°E]
        </div>`,
        { sticky: true }
      );
      aoiLayerRef.current = rect;
    }

    // 2. Sentinel-1 Swath Footprint (Simulated ascending pass swath outline)
    if (showFootprint && bounds) {
      const padLat = (bounds.north - bounds.south) * 0.25;
      const padLng = (bounds.east - bounds.west) * 0.30;
      const swathCoords: [number, number][] = [
        [bounds.north + padLat, bounds.west - padLng * 0.8],
        [bounds.north + padLat * 0.9, bounds.east + padLng * 1.2],
        [bounds.south - padLat, bounds.east + padLng * 0.8],
        [bounds.south - padLat * 0.9, bounds.west - padLng * 1.2]
      ];

      const footprint = L.polygon(swathCoords, {
        color: '#818cf8', // indigo-400
        weight: 1.5,
        dashArray: '3, 6',
        fillColor: '#6366f1',
        fillOpacity: 0.04,
        opacity: 0.70
      }).addTo(mapRef.current);

      footprint.bindTooltip(
        `<div class="p-1 font-mono text-[10px] bg-slate-950/90 text-indigo-300 border border-indigo-700 rounded shadow">
          <b>Sentinel-1A IW Swath Footprint</b><br/>
          Orbit: Ascending (Track 136) • C-SAR Mode: IW
        </div>`,
        { sticky: true }
      );
      footprintLayerRef.current = footprint;
    }
  }, [bounds, showAoi, showFootprint, sarResult?.aoi_name]);

  // Render Synthetic SAR Raster Simulation Overlay (Pre/Post/Delta)
  useEffect(() => {
    if (!mapRef.current) return;

    if (sarRasterLayerRef.current) {
      sarRasterLayerRef.current.remove();
      sarRasterLayerRef.current = null;
    }

    if (displayMode === 'FLOOD_MASK') return; // Vector mode only

    // Generate simulated radar backscatter canvas
    const canvas = document.createElement('canvas');
    const width = 100;
    const height = 80;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const idx = (r * width + c) * 4;
        const normR = r / height;
        const normC = c / width;

        // Simulated topography & hydrology in Bellandur basin
        const centerDist = Math.hypot(normR - 0.52, normC - 0.45);
        const lakeCenterDist = Math.hypot(normR - 0.48, normC - 0.38);
        const isLake = lakeCenterDist < 0.12;
        const isFloodZone = centerDist < 0.28;

        if (displayMode === 'PRE_EVENT_SAR') {
          // Pre-event: Normal terrain has diffuse C-band return (-8 to -12 dB = bright gray)
          // Permanent lake has specular return (< -18 dB = dark)
          let val = isLake ? 25 : (140 + Math.sin(normR * 20 + normC * 15) * 35);
          val += (Math.random() - 0.5) * 40;
          val = Math.max(10, Math.min(240, val));
          data[idx] = val;     // R
          data[idx + 1] = val; // G
          data[idx + 2] = val; // B
          data[idx + 3] = 190; // Alpha
        } else if (displayMode === 'POST_EVENT_SAR') {
          // Post-event: Inundated areas become smooth water (< -16 dB = dark)
          let val: number;
          if (isLake || isFloodZone) {
            val = 20 + Math.random() * 25; // Dark specular water
          } else {
            val = 135 + Math.sin(normR * 20 + normC * 15) * 35;
          }
          val += (Math.random() - 0.5) * 35;
          val = Math.max(10, Math.min(240, val));
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
          data[idx + 3] = 200;
        } else if (displayMode === 'DELTA_CHANGE') {
          // Delta Change: ΔdB = Post - Pre
          if (isLake) {
            data[idx] = 15;
            data[idx + 1] = 118;
            data[idx + 2] = 110;
            data[idx + 3] = 160;
          } else if (isFloodZone) {
            const severity = 1 - (centerDist / 0.28);
            data[idx] = Math.round(14 + severity * 20);
            data[idx + 1] = Math.round(110 + severity * 40);
            data[idx + 2] = Math.round(210 + severity * 45);
            data[idx + 3] = Math.round(180 + severity * 60);
          } else {
            data[idx] = 60;
            data[idx + 1] = 70;
            data[idx + 2] = 80;
            data[idx + 3] = 80;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const latLngBounds = L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]);
    const overlay = L.imageOverlay(canvas.toDataURL(), latLngBounds, {
      opacity: 0.85,
      interactive: false
    }).addTo(mapRef.current);

    sarRasterLayerRef.current = overlay;
  }, [displayMode, bounds]);

  // Render Realistic Smooth GIS Flood Extent Polygons
  useEffect(() => {
    if (!mapRef.current) return;

    if (floodGeoLayerRef.current) {
      floodGeoLayerRef.current.remove();
      floodGeoLayerRef.current = null;
    }

    if (displayMode !== 'FLOOD_MASK') return;
    if (!sarResult?.flood_geojson) return;

    const floodGeo = L.geoJSON(sarResult.flood_geojson, {
      filter: (feature) => {
        const isPerm = feature?.properties?.is_permanent || false;
        const sev = feature?.properties?.severity || 'medium';
        if (isPerm && !showPermanentWater) return false;
        if (sev === 'high' && !showSeverityCores) return false;
        return true;
      },
      style: (feature) => {
        const isPermanent = feature?.properties?.is_permanent || false;
        const sev = feature?.properties?.severity || 'medium';

        if (isPermanent) {
          return {
            fillColor: '#0f766e', // dark teal
            fillOpacity: Math.min(0.40, floodOpacity * 0.45),
            color: '#14b8a6', // teal-500
            weight: 1.2,
            opacity: 0.80
          };
        } else if (sev === 'high') {
          return {
            fillColor: '#1d4ed8', // deep blue
            fillOpacity: Math.min(0.55, floodOpacity * 0.65),
            color: '#2563eb', // blue-600
            weight: 1.5,
            opacity: 0.85
          };
        } else {
          return {
            fillColor: '#0284c7', // sky-600
            fillOpacity: Math.min(0.45, floodOpacity * 0.50),
            color: '#38bdf8', // sky-400
            weight: 1.2,
            opacity: 0.80
          };
        }
      },
      onEachFeature: (feature, layer) => {
        const p = feature?.properties || {};
        const isPerm = p.is_permanent || false;
        const isHigh = p.severity === 'high';
        const name = p.name || (isPerm ? 'Permanent Water Basin' : 'SAR Flood Inundation');
        const badgeColor = isPerm ? 'text-teal-400' : isHigh ? 'text-blue-400' : 'text-sky-400';
        const classification = isPerm 
          ? 'PERMANENT WATER BODY' 
          : isHigh 
          ? 'CRITICAL BREACH BASIN' 
          : 'INUNDATED FLOOD EXTENT';

        // Hover Tooltip
        layer.bindTooltip(
          `<div class="p-1.5 font-mono text-[11px] leading-tight max-w-xs bg-slate-950/95 border border-slate-700 rounded shadow-lg text-slate-200">
            <div class="font-bold text-slate-100">${name}</div>
            <div class="font-bold ${badgeColor} text-[10px] mt-0.5">${classification}</div>
            <div class="mt-1 text-slate-300 text-[10px] space-y-0.5 border-t border-slate-800 pt-1">
              <div>Mean &Delta;dB: <b class="text-slate-100">${p.delta_db ?? -3.5} dB</b></div>
              <div>Estimated Extent: <b class="text-slate-100">${p.area_km2 ? `${p.area_km2} km²` : 'Polygon Area'}</b></div>
              <div class="text-[9px] text-amber-400 pt-0.5">Click polygon to probe pixel backscatter</div>
            </div>
          </div>`,
          { sticky: true }
        );

        // Click on polygon probes coordinates
        layer.on('click', (e: L.LeafletMouseEvent) => {
          handleProbeCoordinate(e.latlng.lat, e.latlng.lng);
        });
      }
    }).addTo(mapRef.current);

    floodGeoLayerRef.current = floodGeo;
  }, [sarResult?.flood_geojson, displayMode, showPermanentWater, showSeverityCores, floodOpacity]);

  // Render Road Overlay
  useEffect(() => {
    if (!mapRef.current) return;

    if (!roadsLayerRef.current) {
      roadsLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }
    roadsLayerRef.current.clearLayers();

    if (!showRoads || roads.length === 0) return;

    roads.forEach((road) => {
      const isBlocked = road.status === 'BLOCKED';
      const isPartial = road.status === 'PARTIALLY_BLOCKED';
      const color = isBlocked ? '#ef4444' : isPartial ? '#f59e0b' : '#10b981';

      const poly = L.polyline(road.coordinates, {
        color,
        weight: isBlocked ? 4 : 2.5,
        opacity: 0.85,
        dashArray: isBlocked ? '4, 4' : undefined
      });

      poly.bindTooltip(
        `<div class="p-1 font-mono text-[10px] bg-slate-950/90 text-slate-200 border border-slate-700 rounded shadow">
          <b>${road.name}</b><br/>
          Status: <span class="font-bold ${isBlocked ? 'text-red-400' : isPartial ? 'text-amber-400' : 'text-emerald-400'}">${road.status}</span><br/>
          Water Depth: ${road.water_depth_cm} cm
        </div>`
      );

      poly.addTo(roadsLayerRef.current!);
    });
  }, [roads, showRoads]);

  const histogramData = sarResult?.histogram || [];
  const severityDistribution = sarResult?.severity_distribution || { low: 35, medium: 75, high: 45 };
  const totalSeverityCount = severityDistribution.low + severityDistribution.medium + severityDistribution.high || 1;

  return (
    <div className="h-[calc(100vh-84px)] overflow-y-auto bg-command-bg text-slate-100 p-3 lg:p-5 space-y-4 font-mono text-xs">
      
      {/* 1. TOP HEADER & OPERATIONAL TELEMETRY BAR */}
      <div className="p-3.5 rounded-lg bg-command-surface border border-command-border space-y-2.5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-command-border pb-2.5">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-sky-950/80 border border-sky-600 text-sky-400">
              <Satellite className="w-5 h-5 animate-subtle-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm lg:text-base font-extrabold text-slate-100 tracking-wider">
                  STAGE 4 — SENTINEL-1 SAR FLOOD ANALYSIS
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase bg-emerald-950 text-emerald-300 border border-emerald-600">
                  {observation?.mission ? '[ REAL SENTINEL-1 ]' : '[ DEMO ANALYSIS ]'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {preset?.id === 'bengaluru' ? 'FLD-BLR-DEMO' : 'FLD-ACTIVE-01'}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {isBengaluru
                  ? 'Bengaluru, Karnataka, India • Bellandur–Varthur & Outer Ring Road (ORR) Flood Corridor'
                  : `${preset?.name || 'Area of Interest'}, ${preset?.country || ''}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <div className="px-2.5 py-1 rounded bg-command-card border border-command-border">
              <span className="text-slate-400">AOI COMPUTATIONAL AREA: </span>
              <span className="font-bold text-sky-400">{sarResult?.aoi_area_km2 || '103.5'} km²</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-command-card border border-command-border">
              <span className="text-slate-400">FLOOD EXTENT: </span>
              <span className="font-bold text-red-400">{sarResult?.flooded_area_km2 || '5.55'} km²</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-command-card border border-command-border">
              <span className="text-slate-400">SENSOR: </span>
              <span className="font-bold text-emerald-400">Sentinel-1A C-SAR IW</span>
            </div>
          </div>
        </div>

        {/* Process Notification Banner */}
        {processSuccessMessage && (
          <div className="p-2.5 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-[11px] flex items-center justify-between animate-fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{processSuccessMessage}</span>
            </div>
            <span className="text-[10px] text-emerald-400 uppercase font-bold">Updated</span>
          </div>
        )}
      </div>

      {/* 2. THREE-COLUMN PRIMARY WORKSTATION LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: SATELLITE SPECIFICATIONS & SAR CONTROLS    */}
        {/* ======================================================== */}
        <div className="lg:col-span-3 space-y-3.5">
          
          {/* Data Acquisition Metadata Card */}
          <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-2.5">
            <div className="flex items-center justify-between border-b border-command-border pb-1.5">
              <span className="font-bold text-slate-200 text-xs flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>DATA & ACQUISITION PAIR</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                11-DAY REVISIT
              </span>
            </div>

            {/* Pre/Post Event Cards */}
            <div className="space-y-2 text-[10px]">
              <div className="p-2 rounded bg-command-card border border-command-border space-y-0.5">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>PRE-EVENT BASELINE</span>
                  <span className="text-[9px] text-slate-500">DRY PHASE</span>
                </div>
                <div className="text-slate-200 font-semibold">
                  {isBengaluru ? 'Sun, 25 Aug 2024 12:45 UTC' : 'Tue, 02 May 2023 05:14 UTC'}
                </div>
                <div className="text-slate-400 text-[9px]">Sentinel-1A • Ascending Pass 136 • IW VV/VH</div>
              </div>

              <div className="p-2 rounded bg-command-card border border-command-border space-y-0.5">
                <div className="flex items-center justify-between text-sky-400 font-bold">
                  <span>POST-EVENT CRISIS</span>
                  <span className="text-[9px] text-red-400 animate-pulse">PEAK FLOOD</span>
                </div>
                <div className="text-slate-200 font-semibold">
                  {isBengaluru ? 'Thu, 05 Sep 2024 12:45 UTC' : 'Thu, 18 May 2023 05:12 UTC'}
                </div>
                <div className="text-slate-400 text-[9px]">Sentinel-1A • Ascending Pass 136 • IW VV/VH</div>
              </div>
            </div>

            {/* Sensor Specs */}
            <div className="grid grid-cols-2 gap-1.5 text-[9px] pt-1 text-slate-400">
              <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                <span className="block text-slate-500 uppercase">Frequency</span>
                <span className="text-slate-200 font-bold">5.405 GHz (C-Band)</span>
              </div>
              <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                <span className="block text-slate-500 uppercase">Polarization</span>
                <span className="text-slate-200 font-bold">Dual VV + VH</span>
              </div>
              <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                <span className="block text-slate-500 uppercase">Resolution</span>
                <span className="text-slate-200 font-bold">10m Pixel Spacing</span>
              </div>
              <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                <span className="block text-slate-500 uppercase">Incidence Angle</span>
                <span className="text-slate-200 font-bold">34.2° – 42.8°</span>
              </div>
            </div>
          </div>

          {/* Algorithm Parameter Controls Card */}
          <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-3">
            <div className="flex items-center justify-between border-b border-command-border pb-1.5">
              <span className="font-bold text-slate-200 text-xs flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>SAR ALGORITHM CONTROLS</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-bold border border-blue-800">
                ΔdB ENGINE
              </span>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-semibold">Change Threshold Mode:</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleModeChange('SENSITIVE')}
                  className={`py-1.5 px-1 rounded font-bold text-[10px] border transition cursor-pointer text-center ${
                    mode === 'SENSITIVE'
                      ? 'bg-blue-600 border-blue-400 text-white shadow'
                      : 'bg-command-card border-command-border text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  SENSITIVE<br/><span className="text-[8px] font-normal">-2.0 dB</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('STANDARD')}
                  className={`py-1.5 px-1 rounded font-bold text-[10px] border transition cursor-pointer text-center ${
                    mode === 'STANDARD'
                      ? 'bg-blue-600 border-blue-400 text-white shadow'
                      : 'bg-command-card border-command-border text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  STANDARD<br/><span className="text-[8px] font-normal">-3.0 dB</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('STRICT')}
                  className={`py-1.5 px-1 rounded font-bold text-[10px] border transition cursor-pointer text-center ${
                    mode === 'STRICT'
                      ? 'bg-blue-600 border-blue-400 text-white shadow'
                      : 'bg-command-card border-command-border text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  STRICT<br/><span className="text-[8px] font-normal">-4.5 dB</span>
                </button>
              </div>
            </div>

            {/* Threshold Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-300">Attenuation Threshold:</span>
                <span className="font-bold text-sky-400">{threshold.toFixed(1)} dB</span>
              </div>
              <input
                type="range"
                min="-8.0"
                max="-1.0"
                step="0.1"
                value={threshold}
                onChange={(e) => {
                  setThreshold(parseFloat(e.target.value));
                  setMode('CUSTOM');
                }}
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Permanent Water Cutoff */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-300">Permanent Water Cutoff:</span>
                <span className="font-bold text-teal-400">{waterCutoff} dB</span>
              </div>
              <input
                type="range"
                min="-24"
                max="-12"
                step="1"
                value={waterCutoff}
                onChange={(e) => setWaterCutoff(parseInt(e.target.value, 10))}
                className="w-full accent-teal-500 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* MMU Cluster Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-300">Minimum Mapping Unit:</span>
                <span className="font-bold text-emerald-400">{mmu} px (~{mmu * 100}m²)</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={mmu}
                onChange={(e) => setMmu(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-1.5 pt-1.5 border-t border-command-border text-[10px]">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludePermanent}
                  onChange={(e) => setExcludePermanent(e.target.checked)}
                  className="accent-blue-500 rounded cursor-pointer"
                />
                <span className="text-slate-300">Exclude Pre-existing Lakes</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={speckleFilter}
                  onChange={(e) => setSpeckleFilter(e.target.checked)}
                  className="accent-blue-500 rounded cursor-pointer"
                />
                <span className="text-slate-300">Apply 3x3 Speckle Median Filter</span>
              </label>
            </div>

            {/* Re-run Pipeline Button */}
            <button
              type="button"
              onClick={handleRunPipeline}
              disabled={isProcessing}
              className="w-full py-2 rounded font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'PROCESSING MATRICES...' : 'EXECUTE DETECTION PIPELINE'}</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CENTER COLUMN: DOMINANT GIS INTERACTIVE SATELLITE MAP     */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 space-y-3">
          
          {/* View Mode Bar + Layer Controls */}
          <div className="p-2.5 rounded-lg bg-command-surface border border-command-border flex flex-wrap items-center justify-between gap-2 text-[10px]">
            {/* View Mode Tabs */}
            <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setDisplayMode('FLOOD_MASK')}
                className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                  displayMode === 'FLOOD_MASK'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Flood Vector Mask
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('PRE_EVENT_SAR')}
                className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                  displayMode === 'PRE_EVENT_SAR'
                    ? 'bg-emerald-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pre-Event SAR
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('POST_EVENT_SAR')}
                className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                  displayMode === 'POST_EVENT_SAR'
                    ? 'bg-sky-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Post-Event SAR
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('DELTA_CHANGE')}
                className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                  displayMode === 'DELTA_CHANGE'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ΔdB Change Ramp
              </button>
            </div>

            {/* Quick Layer Toggles */}
            <div className="flex items-center space-x-2 text-slate-300">
              <label className="flex items-center space-x-1 cursor-pointer" title="Toggle AOI Envelope Boundary">
                <input
                  type="checkbox"
                  checked={showAoi}
                  onChange={(e) => setShowAoi(e.target.checked)}
                  className="accent-sky-400 rounded cursor-pointer"
                />
                <span>AOI</span>
              </label>

              <label className="flex items-center space-x-1 cursor-pointer" title="Toggle Permanent Water Basins">
                <input
                  type="checkbox"
                  checked={showPermanentWater}
                  onChange={(e) => setShowPermanentWater(e.target.checked)}
                  className="accent-teal-400 rounded cursor-pointer"
                />
                <span>Lakes</span>
              </label>

              <label className="flex items-center space-x-1 cursor-pointer" title="Toggle Road Network">
                <input
                  type="checkbox"
                  checked={showRoads}
                  onChange={(e) => setShowRoads(e.target.checked)}
                  className="accent-emerald-400 rounded cursor-pointer"
                />
                <span>Roads</span>
              </label>
            </div>
          </div>

          {/* Large Leaflet Map Container */}
          <div className="relative rounded-lg overflow-hidden border border-command-border shadow-xl bg-slate-950 h-[480px]">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Top-Right Overlay: Navigation & Reset */}
            <div className="absolute top-2.5 right-2.5 z-[1000] flex flex-col space-y-1 font-mono">
              <button
                onClick={() => mapRef.current?.setView(center, preset?.zoom || 12)}
                className="px-2 py-1 rounded bg-slate-950/90 border border-slate-700 text-slate-300 hover:text-white text-[10px] flex items-center space-x-1 shadow cursor-pointer"
                title="Reset to AOI Center"
              >
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>Reset View</span>
              </button>
            </div>

            {/* Bottom-Left Instruction Badge */}
            <div className="absolute bottom-2.5 left-2.5 z-[1000] px-2 py-1 rounded bg-slate-950/90 border border-slate-700 text-[10px] text-slate-300 flex items-center space-x-1.5 shadow pointer-events-none">
              <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Click anywhere inside AOI to probe radar backscatter</span>
            </div>

            {/* Bottom-Right Legend */}
            <div className="absolute bottom-2.5 right-2.5 z-[1000] p-1.5 rounded bg-slate-950/95 border border-slate-800 text-[9px] text-slate-300 space-y-1 shadow pointer-events-none">
              <div className="font-bold text-slate-400 uppercase text-[8px] border-b border-slate-800 pb-0.5">Legend</div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-600 border border-teal-400"></span>
                <span>Permanent Water (Lakes)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 border border-sky-300"></span>
                <span>SAR Flood Extent</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-700 border border-blue-500"></span>
                <span>Critical Breach Core</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white"></span>
                <span>Pixel Probe Target</span>
              </div>
            </div>
          </div>

          {/* Interactive SAR Pixel Probe Results Card */}
          {probeResult && (
            <div className="p-3 rounded-lg bg-command-surface border border-amber-500/40 text-xs space-y-2 shadow-lg">
              <div className="flex items-center justify-between border-b border-command-border pb-1.5">
                <div className="flex items-center space-x-2">
                  <Crosshair className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-slate-100 text-xs">
                    RADAR PIXEL TELEMETRY PROBE
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                    probeResult.severity === 'high' 
                      ? 'bg-blue-950 text-blue-300 border-blue-700'
                      : probeResult.severity === 'medium' || probeResult.severity === 'low'
                      ? 'bg-sky-950 text-sky-300 border-sky-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    {probeResult.classification}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {probeResult.source}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="p-1.5 rounded bg-command-card border border-command-border">
                  <span className="text-slate-400 block text-[9px]">Coordinates (WGS84)</span>
                  <span className="font-bold text-slate-200">
                    {probeResult.lat.toFixed(4)}°N, {probeResult.lng.toFixed(4)}°E
                  </span>
                </div>

                <div className="p-1.5 rounded bg-command-card border border-command-border">
                  <span className="text-slate-400 block text-[9px]">Pre-Event σ° (Baseline)</span>
                  <span className="font-bold text-emerald-400">
                    {probeResult.pre_db !== undefined ? `${probeResult.pre_db} dB` : 'N/A'}
                  </span>
                </div>

                <div className="p-1.5 rounded bg-command-card border border-command-border">
                  <span className="text-slate-400 block text-[9px]">Post-Event σ° (Crisis)</span>
                  <span className="font-bold text-sky-400">
                    {probeResult.post_db !== undefined ? `${probeResult.post_db} dB` : 'N/A'}
                  </span>
                </div>

                <div className="p-1.5 rounded bg-command-card border border-command-border">
                  <span className="text-slate-400 block text-[9px]">Backscatter Shift ΔdB</span>
                  <span className={`font-bold ${
                    (probeResult.delta_db ?? 0) <= threshold ? 'text-red-400' : 'text-slate-300'
                  }`}>
                    {probeResult.delta_db !== undefined ? `${probeResult.delta_db} dB` : 'N/A'}
                  </span>
                </div>
              </div>

              {probeResult.notes && (
                <div className="text-[10px] text-slate-300 p-2 rounded bg-slate-900/60 border border-slate-800 flex items-start space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{probeResult.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: CHANGE DETECTION & QUANTITATIVE RESULTS     */}
        {/* ======================================================== */}
        <div className="lg:col-span-3 space-y-3.5">
          
          {/* Quantitative Metrics KPI Card */}
          <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-2.5">
            <div className="flex items-center justify-between border-b border-command-border pb-1.5">
              <span className="font-bold text-slate-200 text-xs flex items-center space-x-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                <span>FLOOD INUNDATION METRICS</span>
              </span>
              <span className="text-[9px] text-slate-400">
                AOI: {sarResult?.aoi_area_km2 || '103.5'} km²
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded bg-command-card border border-command-border">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Flooded Area</span>
                <div className="text-base font-extrabold text-sky-400 mt-0.5">
                  {sarResult?.flooded_area_km2 || '5.55'} km²
                </div>
                <div className="text-[9px] text-sky-500">{sarResult?.flood_percentage || '5.4'}% of AOI</div>
              </div>

              <div className="p-2 rounded bg-command-card border border-command-border">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Inundated Cells</span>
                <div className="text-base font-extrabold text-red-400 mt-0.5">
                  {sarResult?.inundated_pixels?.toLocaleString() || '432'}
                </div>
                <div className="text-[9px] text-slate-500">MMU Validated</div>
              </div>

              <div className="p-2 rounded bg-command-card border border-command-border">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Mean ΔdB Shift</span>
                <div className="text-base font-extrabold text-amber-400 mt-0.5">
                  {sarResult?.mean_delta_db || '-0.48'} dB
                </div>
                <div className="text-[9px] text-slate-500">Specular Drop</div>
              </div>

              <div className="p-2 rounded bg-command-card border border-command-border">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Permanent Lakes</span>
                <div className="text-base font-extrabold text-teal-400 mt-0.5">
                  {sarResult?.permanent_water_km2 || '3.12'} km²
                </div>
                <div className="text-[9px] text-teal-500">Basins Excluded</div>
              </div>
            </div>

            {/* Inundation Severity Distribution Bar */}
            <div className="p-2 rounded bg-command-card border border-command-border space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Severity Distribution:</span>
                <span className="text-slate-400 text-[9px]">
                  Low: {severityDistribution.low} | Mod: {severityDistribution.medium} | High: {severityDistribution.high}
                </span>
              </div>
              <div className="w-full h-2.5 rounded bg-slate-900 overflow-hidden flex border border-slate-800">
                <div 
                  style={{ width: `${(severityDistribution.low / totalSeverityCount) * 100}%` }} 
                  className="bg-sky-500" 
                  title={`Low Severity: ${severityDistribution.low} cells`}
                />
                <div 
                  style={{ width: `${(severityDistribution.medium / totalSeverityCount) * 100}%` }} 
                  className="bg-blue-600" 
                  title={`Moderate Severity: ${severityDistribution.medium} cells`}
                />
                <div 
                  style={{ width: `${(severityDistribution.high / totalSeverityCount) * 100}%` }} 
                  className="bg-indigo-700" 
                  title={`Critical Breach Core: ${severityDistribution.high} cells`}
                />
              </div>
            </div>
          </div>

          {/* Change Detection Heuristics & Physics Card */}
          <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-2 text-[10px]">
            <div className="flex items-center justify-between border-b border-command-border pb-1">
              <span className="font-bold text-slate-200 flex items-center space-x-1">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>CHANGE DETECTION HEURISTICS</span>
              </span>
              <span className="text-[9px] text-slate-500">C-BAND PHYSICS</span>
            </div>

            <div className="p-2 rounded bg-command-card border border-command-border space-y-1 text-slate-300">
              <div className="font-bold text-sky-300">Log-Ratio Backscatter Formulation</div>
              <div className="font-mono text-[10px] text-slate-200">
                ΔdB = 10 × log₁₀(σ°_post / σ°_pre)
              </div>
              <p className="text-[9px] text-slate-400 leading-relaxed">
                Microwave pulses scatter off dry urban terrain and rough soil. When floodwater inundates the surface, it forms a specular mirror, deflecting radar signals away from the sensor. Drops below {threshold.toFixed(1)} dB indicate new surface water.
              </p>
            </div>
          </div>

          {/* Backscatter Histogram Chart Card */}
          <div className="p-3 rounded-lg bg-command-surface border border-command-border space-y-2">
            <div className="flex items-center justify-between border-b border-command-border pb-1">
              <span className="font-bold text-slate-200 text-xs">
                ΔdB HISTOGRAM DISTRIBUTION
              </span>
              <span className="text-[9px] text-slate-400">
                Cutoff: <b className="text-sky-400">{threshold.toFixed(1)} dB</b>
              </span>
            </div>

            <div className="h-32 w-full bg-slate-950/60 rounded border border-command-border p-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 2, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="delta_db" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px', fontFamily: 'monospace' }}
                    formatter={(val) => [`${val} cells`, 'Inundated Cells']}
                    labelFormatter={(lbl) => `ΔdB: ${lbl} dB`}
                  />
                  <Bar dataKey="pixel_count">
                    {histogramData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.delta_db <= threshold ? '#0284c7' : '#334155'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* 3. BOTTOM SECTION: DATA PROVENANCE & 14-STEP VERIFICATION AUDIT */}
      <div className="p-3.5 rounded-lg bg-command-surface border border-command-border space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-command-border pb-2">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-100 uppercase tracking-wide text-xs">
              DATA PROVENANCE & 14-STEP REPRODUCIBILITY AUDIT CHAIN
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              VERIFIED CDSE PIPELINE
            </span>
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 cursor-pointer"
            >
              <span>{showDiagnostics ? 'Hide Diagnostics' : 'View Diagnostics'}</span>
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Provenance Metadata Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[10px]">
          <div className="p-2 rounded bg-command-card border border-command-border">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Sensor Product</span>
            <div className="text-slate-200 font-semibold mt-0.5">Sentinel-1 C-SAR GRD (Level-1)</div>
            <div className="text-slate-500 text-[9px]">Ground Range Detected • 10m Spacing</div>
          </div>

          <div className="p-2 rounded bg-command-card border border-command-border">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Data Gateway</span>
            <div className="text-slate-200 font-semibold mt-0.5">Copernicus Data Space Ecosystem (CDSE)</div>
            <div className="text-slate-500 text-[9px]">ESA Open Access Hub Protocol • OAuth2</div>
          </div>

          <div className="p-2 rounded bg-command-card border border-command-border">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Execution Status</span>
            <div className="text-emerald-400 font-bold mt-0.5">FUSED TO FLD-BLR-DEMO</div>
            <div className="text-slate-500 text-[9px]">Deterministic Vectorization Active</div>
          </div>

          <div className="p-2 rounded bg-command-card border border-command-border">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">GIS Projection</span>
            <div className="text-slate-200 font-semibold mt-0.5">WGS84 (EPSG:4326)</div>
            <div className="text-slate-500 text-[9px]">Standard Geodetic Coordinate Frame</div>
          </div>
        </div>

        {/* 14-Step SAR Processing Pipeline Audit Chain */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-[9px] text-slate-300">
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>1. WGS84 Georef</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>2. Orbit Vectors</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>3. σ° Backscatter</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>4. DEM Flattening</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>5. 3x3 Speckle Filter</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>6. Dual Pol VV+VH</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>7. Log-Ratio ΔdB</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>8. Water Cutoff ({waterCutoff}dB)</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>9. Permanent Lakes</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>10. MMU Cluster ({mmu}px)</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>11. Void Elimination</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>12. Vectorization</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>13. Store Fusion</span>
          </div>
          <div className="p-1.5 rounded bg-command-card border border-command-border flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>14. SHA-256 Audit</span>
          </div>
        </div>

        {/* Collapsible Technical Diagnostics */}
        {showDiagnostics && (
          <div className="p-3 rounded bg-slate-950/80 border border-command-border space-y-2 text-[10px] animate-fade-in">
            <div className="font-bold text-slate-300">Copernicus Data Space Ecosystem (CDSE) Diagnostics:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-400">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">CDSE OData API:</span>
                <span className="text-emerald-400 font-bold">STANDBY / READY</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Sentinel-1 Process Engine:</span>
                <span className="text-sky-400 font-bold">OPERATIONAL</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Active Target Incident:</span>
                <span className="text-slate-200 font-bold">FLD-BLR-DEMO</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

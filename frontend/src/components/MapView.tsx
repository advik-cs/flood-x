import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Compass, 
  Maximize2, 
  Minimize2, 
  Navigation, 
  AlertTriangle, 
  LifeBuoy, 
  Sliders, 
  Box, 
  Filter, 
  X, 
  Info, 
  Crosshair, 
  Users, 
  CheckCircle2 
} from 'lucide-react';
import { 
  Incident, 
  PresetLocation, 
  ResourceItem, 
  RoadEdge, 
  ShelterItem, 
  SOSReport, 
  DamageReport, 
  DroneDetection, 
  SARAnalysisResult 
} from '../types/index.js';

interface MapViewProps {
  preset: PresetLocation | null;
  incidents: Incident[];
  resources: ResourceItem[];
  shelters: ShelterItem[];
  roads: RoadEdge[];
  sosReports: SOSReport[];
  damageReports: DamageReport[];
  droneDetections: DroneDetection[];
  sarResult?: SARAnalysisResult;
  selectedIncident?: Incident | null;
  onSelectIncident?: (inc: Incident) => void;
  activeRoutePolyline?: [number, number][];
  className?: string;
}

type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const MapView: React.FC<MapViewProps> = ({
  preset,
  incidents,
  resources,
  shelters,
  roads,
  sosReports,
  damageReports,
  droneDetections,
  sarResult,
  selectedIncident,
  onSelectIncident,
  activeRoutePolyline,
  className = 'h-full w-full'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // 3D & Filter Controls
  const [is3DView, setIs3DView] = useState<boolean>(false);
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | PriorityLevel>('ALL');
  const [activeCardIncident, setActiveCardIncident] = useState<Incident | null>(null);

  // Layer Visibility State
  const [showSatellite, setShowSatellite] = useState(true);
  const [showFlood, setShowFlood] = useState(true);
  const [showPriorityZones, setShowPriorityZones] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showSos, setShowSos] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showDetections, setShowDetections] = useState(true);
  const [showAoi, setShowAoi] = useState(true);
  const [showPermanentWater, setShowPermanentWater] = useState(true);
  const [showSeverityZones, setShowSeverityZones] = useState(true);
  const [floodOpacity, setFloodOpacity] = useState(0.70);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Layer groups refs
  const baseTileRef = useRef<L.TileLayer | null>(null);
  const streetTileRef = useRef<L.TileLayer | null>(null);
  const floodLayerRef = useRef<L.GeoJSON | null>(null);
  const priorityZonesLayerRef = useRef<L.LayerGroup | null>(null);
  const roadsLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null);
  const resourcesLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const sosLayerRef = useRef<L.LayerGroup | null>(null);
  const detectionsLayerRef = useRef<L.LayerGroup | null>(null);
  const aoiLayerRef = useRef<L.Rectangle | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Helper: Extract priority level from incident
  const getIncidentLevel = (inc: Incident): PriorityLevel => {
    const raw = (inc.priority || inc.priorities?.category || inc.severity || '').toUpperCase();
    if (raw === 'CRITICAL') return 'CRITICAL';
    if (raw === 'HIGH') return 'HIGH';
    if (raw === 'MEDIUM' || raw === 'MODERATE') return 'MEDIUM';
    return 'LOW';
  };

  // Helper: Extract priority score from incident (0.00 to 1.00)
  const getIncidentScore = (inc: Incident): number => {
    if (typeof inc.priority_breakdown?.score === 'number') {
      return inc.priority_breakdown.score;
    }
    if (typeof inc.priorities?.score === 'number') {
      return inc.priorities.score > 1 ? inc.priorities.score / 100 : inc.priorities.score;
    }
    const level = getIncidentLevel(inc);
    if (level === 'CRITICAL') return 0.88;
    if (level === 'HIGH') return 0.65;
    if (level === 'MEDIUM') return 0.42;
    return 0.18;
  };

  // 1. Initialize Leaflet Map with strict visual hierarchy panes
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter = preset?.center || [12.9352, 77.6835];
    const initialZoom = preset?.zoom || 12;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    });

    // Configure Custom Panes for Strict Visual Hierarchy
    // 1. Basemap: zIndex 200 (Leaflet default tilePane)
    // 2. AOI: zIndex 300
    // 3. Flood Extent: zIndex 400 (overlayPane)
    // 4. Shelters: zIndex 440
    // 5. Roads: zIndex 460
    // 6. Resources: zIndex 500
    // 7. Priority Influence Zones: zIndex 520
    // 8. Ground / Drone Detections: zIndex 580
    // 9. Incidents (Critical / High / Medium / Low): zIndex 630-650
    const aoiPane = map.createPane('aoiPane');
    aoiPane.style.zIndex = '300';

    const sheltersPane = map.createPane('sheltersPane');
    sheltersPane.style.zIndex = '440';

    const roadsPane = map.createPane('roadsPane');
    roadsPane.style.zIndex = '460';

    const resourcesPane = map.createPane('resourcesPane');
    resourcesPane.style.zIndex = '500';

    const priorityZonesPane = map.createPane('priorityZonesPane');
    priorityZonesPane.style.zIndex = '520';

    const detectionsPane = map.createPane('detectionsPane');
    detectionsPane.style.zIndex = '580';

    const otherIncidentsPane = map.createPane('otherIncidentsPane');
    otherIncidentsPane.style.zIndex = '630';

    const highIncidentsPane = map.createPane('highIncidentsPane');
    highIncidentsPane.style.zIndex = '640';

    const criticalIncidentsPane = map.createPane('criticalIncidentsPane');
    criticalIncidentsPane.style.zIndex = '650';

    // High-Resolution ESRI World Imagery (Satellite) + Reference Labels
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );
    const streetOverlay = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19, opacity: 0.85 }
    );

    satLayer.addTo(map);
    streetOverlay.addTo(map);

    baseTileRef.current = satLayer;
    streetTileRef.current = streetOverlay;

    // Controls
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Layer groups
    priorityZonesLayerRef.current = L.layerGroup().addTo(map);
    roadsLayerRef.current = L.layerGroup().addTo(map);
    incidentsLayerRef.current = L.layerGroup().addTo(map);
    resourcesLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    sosLayerRef.current = L.layerGroup().addTo(map);
    detectionsLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Center/Fit to Preset AOI
  useEffect(() => {
    if (!mapRef.current || !preset) return;
    mapRef.current.setView(preset.center, preset.zoom);

    if (aoiLayerRef.current) {
      aoiLayerRef.current.remove();
      aoiLayerRef.current = null;
    }

    if (showAoi && preset.bounds) {
      const b = preset.bounds;
      const bounds = L.latLngBounds([b.south, b.west], [b.north, b.east]);
      const rect = L.rectangle(bounds, {
        color: '#0284c7',
        weight: 1.5,
        dashArray: '4, 4',
        fill: false,
        opacity: 0.8,
        pane: 'aoiPane'
      }).addTo(mapRef.current);
      aoiLayerRef.current = rect;
    }
  }, [preset, showAoi]);

  // 3. Render 3D-Oriented Extruded / Layered Flood Inundation Polygons
  useEffect(() => {
    if (!mapRef.current) return;

    if (floodLayerRef.current) {
      floodLayerRef.current.remove();
      floodLayerRef.current = null;
    }

    if (!showFlood || !sarResult?.flood_geojson) return;

    const floodGeo = L.geoJSON(sarResult.flood_geojson, {
      filter: (feature) => {
        const isPerm = feature?.properties?.is_permanent || false;
        const sev = feature?.properties?.severity || 'medium';
        if (isPerm && !showPermanentWater) return false;
        if (sev === 'high' && !showSeverityZones) return false;
        return true;
      },
      style: (feature) => {
        const sev = feature?.properties?.severity || 'medium';
        const isPermanent = feature?.properties?.is_permanent || false;

        // Layered depth styling with extruded visual cues:
        // - High severity: Deep cobalt with elevated opacity and glowing boundary
        // - Moderate severity: Translucent cyan-blue
        // - Permanent water: Deep teal
        if (isPermanent) {
          return {
            fillColor: '#0f766e',
            fillOpacity: Math.min(0.35, Math.max(0.20, floodOpacity * 0.35)),
            color: '#0d9488',
            weight: 1.2,
            opacity: 0.70
          };
        } else if (sev === 'high') {
          return {
            fillColor: '#1d4ed8',
            fillOpacity: Math.min(0.50, Math.max(0.30, floodOpacity * 0.55)),
            color: '#38bdf8',
            weight: 1.8,
            opacity: 0.85
          };
        } else {
          return {
            fillColor: '#0284c7',
            fillOpacity: Math.min(0.40, Math.max(0.24, floodOpacity * 0.45)),
            color: '#0369a1',
            weight: 1.2,
            opacity: 0.75
          };
        }
      },
      onEachFeature: (feature, layer) => {
        const p = feature?.properties || {};
        const isPermanent = p.is_permanent || false;
        const name = p.name || (isPermanent ? 'Permanent River Channel' : 'SAR Flood Inundation Extent');
        const classification = isPermanent 
          ? 'PERMANENT WATER' 
          : p.severity === 'high' 
          ? 'CRITICAL INUNDATION CORE' 
          : 'SAR FLOOD INUNDATION';
        const deltaDb = p.delta_db ? `${p.delta_db} dB` : 'N/A';
        const area = p.area_km2 ? `${p.area_km2} km²` : 'Continuous Polygon';

        layer.bindTooltip(
          `<div class="p-1.5 font-mono text-[11px] leading-tight max-w-xs bg-slate-950/95 border border-slate-700 rounded shadow-lg text-slate-200">
            <div class="font-bold text-slate-100">${name}</div>
            <div class="font-bold text-sky-400 text-[10px] mt-0.5">${classification}</div>
            <div class="mt-1 text-slate-300 text-[10px] space-y-0.5 border-t border-slate-800 pt-0.5">
              <div>SAR &Delta; Backscatter: <b class="text-slate-100">${deltaDb}</b></div>
              <div>Estimated Extent: <b class="text-slate-100">${area}</b></div>
            </div>
          </div>`,
          { sticky: true }
        );
      }
    }).addTo(mapRef.current);

    floodLayerRef.current = floodGeo;
  }, [sarResult, showFlood, floodOpacity, showPermanentWater, showSeverityZones]);

  // 4. Render Priority Influence Zones (Heat / Halo Overlay around Incidents)
  useEffect(() => {
    if (!priorityZonesLayerRef.current || !mapRef.current) return;
    priorityZonesLayerRef.current.clearLayers();
    if (!showPriorityZones) return;

    incidents.forEach((inc) => {
      const level = getIncidentLevel(inc);
      const isFilteredOut = priorityFilter !== 'ALL' && priorityFilter !== level;

      // Influence zone radius & colors based on existing priority score
      let radius = 450;
      let fillColor = '#eab308'; // Yellow
      let borderColor = '#ca8a04';
      let fillOpacity = 0.08;

      if (level === 'CRITICAL') {
        radius = 900;
        fillColor = '#ef4444'; // Red
        borderColor = '#dc2626';
        fillOpacity = 0.18;
      } else if (level === 'HIGH') {
        radius = 650;
        fillColor = '#f97316'; // Orange
        borderColor = '#ea580c';
        fillOpacity = 0.12;
      } else if (level === 'LOW') {
        radius = 250;
        fillColor = '#22c55e'; // Green
        borderColor = '#16a34a';
        fillOpacity = 0.04;
      }

      if (isFilteredOut) {
        fillOpacity = 0.02;
      }

      const circle = L.circle([inc.location.lat, inc.location.lng], {
        radius,
        fillColor,
        fillOpacity,
        color: borderColor,
        weight: isFilteredOut ? 0.5 : 1.2,
        opacity: isFilteredOut ? 0.2 : 0.6,
        dashArray: level === 'CRITICAL' ? undefined : '4, 4',
        pane: 'priorityZonesPane'
      });

      circle.addTo(priorityZonesLayerRef.current!);
    });
  }, [incidents, showPriorityZones, priorityFilter]);

  // 5. Render Incident Priority Markers (CRITICAL, HIGH, MEDIUM, LOW)
  useEffect(() => {
    if (!incidentsLayerRef.current || !mapRef.current) return;
    incidentsLayerRef.current.clearLayers();

    incidents.forEach((inc) => {
      const level = getIncidentLevel(inc);
      const score = getIncidentScore(inc);
      const isSelected = (selectedIncident?.incident_id === inc.incident_id) || (activeCardIncident?.incident_id === inc.incident_id);
      const isDimmed = priorityFilter !== 'ALL' && priorityFilter !== level;

      // Multi-factor styling: color, size, halo intensity, icon shape, and priority badge
      let markerHtml = '';
      let iconSize: [number, number] = [28, 28];
      let iconAnchor: [number, number] = [14, 14];
      let assignedPane = 'otherIncidentsPane';

      if (level === 'CRITICAL') {
        iconSize = [44, 44];
        iconAnchor = [22, 22];
        assignedPane = 'criticalIncidentsPane';

        markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'}">
            <!-- Pulsing High-Visibility Halo -->
            ${!isDimmed ? '<div class="absolute w-12 h-12 rounded-full bg-red-500/35 animate-ping"></div>' : ''}
            <div class="absolute w-10 h-10 rounded-full bg-red-600/25 blur-xs"></div>
            
            <!-- Elevated 3D Tactical Diamond Pin -->
            <div class="w-9 h-9 rounded-lg rotate-45 border-2 ${isSelected ? 'border-white ring-4 ring-red-400 scale-110' : 'border-red-300'} bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
              <span class="-rotate-45 font-black text-xs">!</span>
            </div>

            <!-- Clear Priority Badge -->
            <div class="absolute -bottom-3.5 px-1 py-0.2 rounded bg-red-950 border border-red-500 text-[8px] font-black text-red-200 tracking-wider shadow whitespace-nowrap">
              CRIT ${score.toFixed(2)}
            </div>
          </div>
        `;
      } else if (level === 'HIGH') {
        iconSize = [36, 36];
        iconAnchor = [18, 18];
        assignedPane = 'highIncidentsPane';

        markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'}">
            ${!isDimmed ? '<div class="absolute w-8 h-8 rounded-full bg-orange-500/25"></div>' : ''}
            
            <!-- Elevated Tactical Shield Pin -->
            <div class="w-7 h-7 rounded-md rotate-12 border-2 ${isSelected ? 'border-white ring-2 ring-orange-400 scale-110' : 'border-orange-300'} bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
              <span class="-rotate-12 font-bold text-[10px]">▲</span>
            </div>

            <!-- Priority Badge -->
            <div class="absolute -bottom-3 px-1 py-0.2 rounded bg-amber-950 border border-orange-500 text-[8px] font-bold text-amber-200 shadow whitespace-nowrap">
              HIGH ${score.toFixed(2)}
            </div>
          </div>
        `;
      } else if (level === 'MEDIUM') {
        iconSize = [30, 30];
        iconAnchor = [15, 15];
        assignedPane = 'otherIncidentsPane';

        markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'}">
            <div class="w-6 h-6 rounded-md border ${isSelected ? 'border-white ring-2 ring-yellow-400 scale-110' : 'border-yellow-300'} bg-amber-600 text-white flex items-center justify-center shadow font-bold text-[9px] hover:scale-105 transition-transform">
              M
            </div>
            <div class="absolute -bottom-2.5 px-1 py-0.1 rounded bg-slate-950 border border-yellow-500 text-[7px] font-bold text-yellow-300 shadow whitespace-nowrap">
              MED
            </div>
          </div>
        `;
      } else {
        // LOW
        iconSize = [24, 24];
        iconAnchor = [12, 12];
        assignedPane = 'otherIncidentsPane';

        markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'}">
            <div class="w-5 h-5 rounded-full border border-emerald-400 bg-emerald-700 text-white flex items-center justify-center shadow text-[8px] font-bold hover:scale-105 transition-transform">
              L
            </div>
          </div>
        `;
      }

      const icon = L.divIcon({
        className: `incident-marker-${level.toLowerCase()}`,
        html: markerHtml,
        iconSize,
        iconAnchor
      });

      const marker = L.marker([inc.location.lat, inc.location.lng], { 
        icon,
        pane: assignedPane
      });

      // Quick hover tooltip
      marker.bindTooltip(
        `<div class="p-1.5 font-mono text-[11px] leading-tight bg-slate-950/95 border border-slate-700 rounded shadow-xl text-slate-100">
          <div class="flex items-center space-x-1.5 font-bold mb-1">
            <span class="px-1.5 py-0.2 rounded text-[9px] font-bold ${
              level === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700' :
              level === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
              level === 'MEDIUM' ? 'bg-yellow-950 text-yellow-300 border border-yellow-700' :
              'bg-emerald-950 text-emerald-300 border border-emerald-700'
            }">${level} (${score.toFixed(2)})</span>
            <span class="text-slate-300 font-normal">${inc.incident_id}</span>
          </div>
          <div class="font-bold text-slate-200 text-[10px]">${inc.name || 'Disaster Sector'}</div>
          <div class="mt-1 text-slate-400 text-[9px]">Click marker to open full tactical breakdown</div>
        </div>`,
        { sticky: true }
      );

      // Click opens the tactical incident information card
      marker.on('click', () => {
        setActiveCardIncident(inc);
        if (onSelectIncident) onSelectIncident(inc);
      });

      marker.addTo(incidentsLayerRef.current!);
    });
  }, [incidents, selectedIncident, activeCardIncident, priorityFilter, onSelectIncident]);

  // 6. Render Ground Detections (Drone/Aerial AI) ONLY when genuine GPS coordinates exist
  useEffect(() => {
    if (!detectionsLayerRef.current || !mapRef.current) return;
    detectionsLayerRef.current.clearLayers();
    if (!showDetections || !droneDetections || droneDetections.length === 0) return;

    // Filter strictly to detections containing valid geospatial metadata (DO NOT invent GPS)
    const georeferencedDetections = droneDetections.filter(
      d => d.location && typeof d.location.lat === 'number' && typeof d.location.lng === 'number'
    );

    georeferencedDetections.forEach((det) => {
      const isPerson = det.object_type === 'person';
      const isBoat = det.object_type === 'boat';

      let markerBg = 'bg-amber-700 border-amber-400';
      if (isPerson) markerBg = 'bg-red-700 border-red-400';
      else if (isBoat) markerBg = 'bg-cyan-700 border-cyan-400';

      const confText = typeof det.confidence === 'number'
        ? `${(det.confidence * 100).toFixed(0)}%`
        : 'Confidence unavailable';

      const markerHtml = `
        <div class="gis-marker-person cursor-pointer">
          <div class="w-6 h-6 rounded-full border-2 ${markerBg} text-white flex items-center justify-center text-[9px] font-bold shadow-lg">
            ${isPerson ? 'P' : isBoat ? 'B' : 'O'}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'detection-tactical-marker',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([det.location!.lat, det.location!.lng], { 
        icon,
        pane: 'detectionsPane'
      });

      marker.bindTooltip(
        `<div class="font-mono text-[11px] leading-tight p-1 bg-slate-950 text-slate-100 rounded border border-slate-700 shadow-xl">
          <div class="font-bold text-red-400 uppercase">PERSON DETECTED</div>
          <div class="text-slate-200 font-bold">${det.id}</div>
          <div class="text-slate-300 text-[10px] mt-0.5">Confidence: <b>${confText}</b></div>
          <div class="text-emerald-400 font-mono text-[9px]">Location: [${det.location!.lat.toFixed(5)}, ${det.location!.lng.toFixed(5)}]</div>
        </div>`
      );

      marker.addTo(detectionsLayerRef.current!);
    });
  }, [droneDetections, showDetections]);

  // 7. Render Roads & Blockage Icons
  useEffect(() => {
    if (!roadsLayerRef.current || !mapRef.current) return;
    roadsLayerRef.current.clearLayers();
    if (!showRoads) return;

    roads.forEach((road) => {
      const isBlocked = road.status === 'BLOCKED';
      const isPartial = road.status === 'PARTIALLY_BLOCKED';

      let color = '#16a34a';
      if (isBlocked) color = '#dc2626';
      else if (isPartial) color = '#ea580c';

      const poly = L.polyline(road.coordinates, {
        color,
        weight: isBlocked ? 4.5 : 3.5,
        opacity: 0.85,
        dashArray: isBlocked ? '5, 5' : undefined,
        pane: 'roadsPane'
      });

      poly.bindTooltip(
        `<div class="font-mono text-[11px] leading-tight">
          <div class="font-bold text-slate-100">${road.name}</div>
          <div class="mt-0.5">
            Status: <span class="font-bold uppercase ${isBlocked ? 'text-red-400' : isPartial ? 'text-amber-400' : 'text-emerald-400'}">${road.status}</span><br/>
            Water Depth: ${road.water_depth_cm} cm | Length: ${road.length_km} km
          </div>
        </div>`
      );

      poly.addTo(roadsLayerRef.current!);
    });
  }, [roads, showRoads]);

  // 8. Render Shelters
  useEffect(() => {
    if (!sheltersLayerRef.current || !mapRef.current) return;
    sheltersLayerRef.current.clearLayers();
    if (!showShelters) return;

    shelters.forEach((sh) => {
      const markerHtml = `
        <div class="w-6 h-6 rounded-full border border-sky-400 bg-sky-900 text-sky-200 flex items-center justify-center shadow">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        className: 'shelter-marker',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([sh.location.lat, sh.location.lng], { 
        icon,
        pane: 'sheltersPane'
      });

      marker.bindTooltip(
        `<div class="font-mono text-[11px] leading-tight">
          <b class="text-sky-300">${sh.name}</b><br/>
          Occupancy: <b>${sh.current_occupancy} / ${sh.capacity}</b><br/>
          Supplies: <b>${sh.supplies_status}</b>
        </div>`
      );

      marker.addTo(sheltersLayerRef.current!);
    });
  }, [shelters, showShelters]);

  // 9. Render Emergency Resources
  useEffect(() => {
    if (!resourcesLayerRef.current || !mapRef.current) return;
    resourcesLayerRef.current.clearLayers();
    if (!showResources) return;

    resources.forEach((res) => {
      const isAvailable = res.status === 'AVAILABLE';
      const isBoat = res.type === 'boat' || res.type === 'BOAT';

      const markerHtml = `
        <div class="w-6 h-6 rounded border ${isAvailable ? 'border-emerald-500 bg-emerald-800' : 'border-slate-500 bg-slate-800'} text-white flex items-center justify-center shadow">
          <span class="text-[9px] font-bold">${isBoat ? 'B' : 'R'}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'resource-marker',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([res.location.lat, res.location.lng], { 
        icon,
        pane: 'resourcesPane'
      });

      marker.bindTooltip(
        `<div class="font-mono text-[11px] leading-tight">
          <b class="text-emerald-400">${res.name}</b> (${res.type.toUpperCase()})<br/>
          Status: <b>${res.status}</b> | Cap: <b>${res.capacity}</b>
        </div>`
      );

      marker.addTo(resourcesLayerRef.current!);
    });
  }, [resources, showResources]);

  // 10. Render SOS Reports
  useEffect(() => {
    if (!sosLayerRef.current || !mapRef.current) return;
    sosLayerRef.current.clearLayers();
    if (!showSos) return;

    sosReports.forEach((s) => {
      const isCritical = s.severity === 'CRITICAL' || s.urgency === 'CRITICAL';
      const markerHtml = `
        <div class="gis-marker-sos cursor-pointer relative">
          ${isCritical ? '<div class="absolute w-7 h-7 rounded-full bg-red-500/40 animate-ping"></div>' : ''}
          <div class="w-5 h-5 rounded-full border border-red-300 bg-red-600 text-white flex items-center justify-center text-[8px] font-bold shadow-md">
            SOS
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'sos-marker',
        html: markerHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([s.location.lat, s.location.lng], { 
        icon,
        pane: 'otherIncidentsPane'
      });

      marker.bindTooltip(
        `<div class="font-mono text-[11px] max-w-xs leading-tight">
          <div class="flex items-center space-x-1 font-bold text-red-400 uppercase">
            <span>${s.category.replace(/_/g, ' ')}</span>
          </div>
          <div class="text-slate-200 mt-0.5">${s.description}</div>
          <div class="mt-1 text-slate-400 text-[10px]">
            Affected: <b>${s.people_affected || s.people_count || 1}</b>
          </div>
        </div>`
      );

      marker.addTo(sosLayerRef.current!);
    });
  }, [sosReports, showSos]);

  // 11. Route Polyline
  useEffect(() => {
    if (!mapRef.current) return;
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (activeRoutePolyline && activeRoutePolyline.length > 1) {
      const line = L.polyline(activeRoutePolyline, {
        color: '#38bdf8',
        weight: 5,
        opacity: 0.9,
        dashArray: '6, 6',
        pane: 'roadsPane'
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(line.getBounds(), { padding: [40, 40] });
      routeLayerRef.current = line;
    }
  }, [activeRoutePolyline]);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!isFullscreen) {
      if (mapContainerRef.current.requestFullscreen) mapContainerRef.current.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Center on Geolocation
  const handleGeolocation = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 13),
      (err) => console.warn('Geolocation failed:', err.message)
    );
  };

  // Reasons list for active card incident
  const activeIncidentReasons = useMemo(() => {
    if (!activeCardIncident) return [];
    if (activeCardIncident.priority_breakdown?.reasons?.length) {
      return activeCardIncident.priority_breakdown.reasons;
    }
    if (activeCardIncident.priorities?.reasons?.length) {
      return activeCardIncident.priorities.reasons;
    }

    // Dynamic explainable reasons from incident properties
    const list: string[] = [];
    if (activeCardIncident.flood_severity >= 0.7) {
      list.push(`Severe flood inundation (${(activeCardIncident.flood_severity * 100).toFixed(0)}% radar backscatter index)`);
    } else if (activeCardIncident.flood_severity >= 0.4) {
      list.push(`Moderate surface water extent (${(activeCardIncident.flood_severity * 100).toFixed(0)}% index)`);
    }
    if (activeCardIncident.people_detected > 0) {
      list.push(`${activeCardIncident.people_detected} people detected by aerial reconnaissance`);
    }
    if (activeCardIncident.sos_reports > 0) {
      list.push(`${activeCardIncident.sos_reports} citizen SOS distress reports logged`);
    }
    if (activeCardIncident.road_status === 'BLOCKED') {
      list.push('Access route completely blocked by floodwaters');
    } else if (activeCardIncident.road_status === 'PARTIALLY_BLOCKED') {
      list.push('Road partially blocked — high-clearance access required');
    }
    if (activeCardIncident.people_affected > 0) {
      list.push(`Estimated ${activeCardIncident.people_affected} residents in affected sector`);
    }
    return list.length > 0 ? list : ['Baseline alert monitored under standard automated response protocol'];
  }, [activeCardIncident]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      
      {/* 3D Perspective Container */}
      <div 
        className="w-full h-full transition-all duration-700 ease-out"
        style={{
          perspective: is3DView ? '1200px' : undefined
        }}
      >
        <div 
          ref={mapContainerRef} 
          className="w-full h-full bg-[#0a0e17] transition-transform duration-700 ease-out"
          style={{
            transform: is3DView ? 'rotateX(22deg) scale(0.96)' : 'none',
            transformOrigin: 'center bottom'
          }}
        />
      </div>

      {/* Top Center: PRIORITY FILTER TOOLBAR (Requirement) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-700/80 shadow-2xl font-mono text-[11px] backdrop-blur-md">
        <span className="text-slate-400 font-bold mr-1 flex items-center space-x-1">
          <Filter className="w-3.5 h-3.5 text-sky-400" />
          <span>SHOW:</span>
        </span>

        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => {
          const isActive = priorityFilter === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => setPriorityFilter(lvl)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer flex items-center space-x-1 ${
                isActive
                  ? lvl === 'CRITICAL'
                    ? 'bg-red-600 text-white shadow-lg'
                    : lvl === 'HIGH'
                    ? 'bg-orange-600 text-white shadow'
                    : lvl === 'MEDIUM'
                    ? 'bg-yellow-600 text-white shadow'
                    : lvl === 'LOW'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-blue-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{lvl}</span>
            </button>
          );
        })}
      </div>

      {/* Top Left: Navigation & Action Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col space-y-1.5 pointer-events-auto font-mono">
        {/* Reset View */}
        <button
          onClick={() => mapRef.current?.setView(preset?.center || [12.9352, 77.6835], preset?.zoom || 12)}
          className="h-7 px-2 rounded bg-slate-900/95 border border-slate-700/80 flex items-center space-x-1.5 text-[10px] text-slate-300 hover:text-white shadow hover:bg-slate-800 transition cursor-pointer"
          title="Reset to AOI Extent"
        >
          <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-bold">RESET VIEW</span>
        </button>

        {/* 3D Perspective Toggle Button */}
        <button
          onClick={() => setIs3DView(!is3DView)}
          className={`h-7 px-2 rounded border flex items-center space-x-1.5 text-[10px] font-bold shadow transition cursor-pointer ${
            is3DView
              ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/30'
              : 'bg-slate-900/95 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Toggle 3D Perspective Disaster Operations View"
        >
          <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{is3DView ? '3D PERSPECTIVE (ON)' : '3D PERSPECTIVE'}</span>
        </button>

        {/* Zoom to Flood Extent */}
        <button
          onClick={() => {
            if (floodLayerRef.current && mapRef.current) {
              const bounds = floodLayerRef.current.getBounds();
              if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [30, 30] });
            }
          }}
          disabled={!sarResult || !showFlood}
          className={`h-7 px-2 rounded border flex items-center space-x-1.5 text-[10px] shadow transition ${
            sarResult && showFlood
              ? 'bg-slate-900/95 border-sky-600/80 text-sky-300 hover:bg-slate-800 hover:text-sky-200 cursor-pointer'
              : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-bold">ZOOM TO FLOOD</span>
        </button>

        <div className="flex space-x-1 pt-0.5">
          <button
            onClick={handleGeolocation}
            className="w-7 h-7 rounded bg-slate-900/95 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white shadow hover:bg-slate-800 transition cursor-pointer"
            title="Center on My Location"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="w-7 h-7 rounded bg-slate-900/95 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white shadow hover:bg-slate-800 transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Top Right: Unified GIS Layer Controls */}
      <div className="absolute top-3 right-12 z-[1000] pointer-events-auto">
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-900/95 border border-slate-700 text-xs font-mono font-semibold text-slate-200 hover:bg-slate-800 shadow cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>LAYERS ({[showFlood, showPriorityZones, showRoads, showShelters, showSos, showResources, showDetections].filter(Boolean).length})</span>
        </button>

        {showLayerPanel && (
          <div className="mt-1.5 w-64 p-3 bg-slate-950/95 border border-slate-700 rounded shadow-2xl text-[11px] font-mono text-slate-300 space-y-2 backdrop-blur-md">
            <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex justify-between items-center text-[10px] tracking-wider uppercase">
              <span>GIS OPERATIONAL LAYERS</span>
              <span className="text-blue-400">COP 3D</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span>Satellite Basemap</span>
              <input 
                type="checkbox" 
                checked={showSatellite} 
                onChange={(e) => {
                  setShowSatellite(e.target.checked);
                  if (baseTileRef.current) {
                    if (e.target.checked) baseTileRef.current.addTo(mapRef.current!);
                    else baseTileRef.current.remove();
                  }
                }} 
                className="accent-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500"></span>
                <span>Flood Extent (SAR)</span>
              </span>
              <input 
                type="checkbox" 
                checked={showFlood} 
                onChange={(e) => setShowFlood(e.target.checked)} 
                className="accent-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/40 border border-red-500"></span>
                <span>Priority Influence Zones</span>
              </span>
              <input 
                type="checkbox" 
                checked={showPriorityZones} 
                onChange={(e) => setShowPriorityZones(e.target.checked)} 
                className="accent-red-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600"></span>
                <span>Ground Detections (AI People)</span>
              </span>
              <input 
                type="checkbox" 
                checked={showDetections} 
                onChange={(e) => setShowDetections(e.target.checked)} 
                className="accent-red-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>Citizen SOS Reports</span>
              </span>
              <input 
                type="checkbox" 
                checked={showSos} 
                onChange={(e) => setShowSos(e.target.checked)} 
                className="accent-red-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                <span>Emergency Fleet / Units</span>
              </span>
              <input 
                type="checkbox" 
                checked={showResources} 
                onChange={(e) => setShowResources(e.target.checked)} 
                className="accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-1 bg-red-500"></span>
                <span>Road Network & Blocks</span>
              </span>
              <input 
                type="checkbox" 
                checked={showRoads} 
                onChange={(e) => setShowRoads(e.target.checked)} 
                className="accent-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-700"></span>
                <span>Evacuation Shelters</span>
              </span>
              <input 
                type="checkbox" 
                checked={showShelters} 
                onChange={(e) => setShowShelters(e.target.checked)} 
                className="accent-sky-500"
              />
            </label>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* CLICKABLE INCIDENT INFORMATION CARD (Connected to Priority API) */}
      {/* ============================================================== */}
      {activeCardIncident && (
        <div className="absolute top-14 right-4 z-[1000] w-80 p-4 rounded-xl bg-slate-950/95 border border-slate-700/80 shadow-2xl text-xs font-mono text-slate-200 pointer-events-auto backdrop-blur-md space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-start justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                INCIDENT ID
              </span>
              <span className="text-sm font-black text-slate-100">
                {activeCardIncident.incident_id}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveCardIncident(null)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Priority:</span>
              <span className={`text-xs font-black tracking-wider uppercase ${
                getIncidentLevel(activeCardIncident) === 'CRITICAL' ? 'text-red-400' :
                getIncidentLevel(activeCardIncident) === 'HIGH' ? 'text-orange-400' :
                getIncidentLevel(activeCardIncident) === 'MEDIUM' ? 'text-yellow-400' :
                'text-emerald-400'
              }`}>
                {getIncidentLevel(activeCardIncident)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Priority Score:</span>
              <span className="text-xs font-mono font-black text-slate-100">
                {getIncidentScore(activeCardIncident).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Explainable Reasons ("Why this is critical") */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide block">
              Why this is {getIncidentLevel(activeCardIncident).toLowerCase()}:
            </span>
            <ul className="space-y-1 text-[10px] text-slate-300 pl-1">
              {activeIncidentReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start space-x-1.5">
                  <span className="text-sky-400 shrink-0 mt-0.5">•</span>
                  <span className="leading-snug">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Action */}
          <div className="p-2 rounded bg-blue-950/40 border border-blue-900/60 space-y-1">
            <span className="text-[10px] font-bold text-sky-300 block">Recommended Action:</span>
            <p className="text-[10px] text-slate-300 leading-snug">
              {getIncidentLevel(activeCardIncident) === 'CRITICAL'
                ? 'Dispatch nearest available rescue resource (Boat / Rescue Team) immediately.'
                : getIncidentLevel(activeCardIncident) === 'HIGH'
                ? 'Urgent response. Allocate high-clearance assets and prepare staging.'
                : 'Monitor sector status and maintain standby rescue availability.'}
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (mapRef.current) {
                  mapRef.current.setView([activeCardIncident.location.lat, activeCardIncident.location.lng], 14);
                }
              }}
              className="flex-1 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center space-x-1 shadow cursor-pointer transition"
            >
              <Crosshair className="w-3 h-3" />
              <span>FOCUS INCIDENT</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardIncident(null)}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold cursor-pointer transition"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PERMANENT COMPACT PRIORITY MAP LEGEND                           */}
      {/* ============================================================== */}
      <div className="absolute bottom-4 right-3 z-[1000] p-3 bg-slate-950/95 border border-slate-800 rounded-lg shadow-2xl text-[10px] font-mono text-slate-300 space-y-2 backdrop-blur-md pointer-events-auto max-w-xs">
        <div className="font-bold text-slate-100 text-[10px] tracking-wider uppercase border-b border-slate-800 pb-1 flex justify-between items-center">
          <span>INCIDENT PRIORITY</span>
          <span className="text-slate-500 text-[8px]">COMMAND CENTER</span>
        </div>

        <div className="space-y-1.5 text-[9px]">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-red-400/80 animate-pulse shrink-0"></span>
            <div>
              <b className="text-red-400">CRITICAL</b>
              <span className="text-slate-400 ml-1.5">Immediate attention</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-md rotate-12 bg-orange-500 border border-orange-300 shrink-0"></span>
            <div>
              <b className="text-orange-400">HIGH</b>
              <span className="text-slate-400 ml-1.5">Urgent response</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 border border-yellow-300 shrink-0"></span>
            <div>
              <b className="text-yellow-400">MEDIUM</b>
              <span className="text-slate-400 ml-1.5">Monitor / respond</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 border border-emerald-300 shrink-0"></span>
            <div>
              <b className="text-emerald-400">LOW</b>
              <span className="text-slate-400 ml-1.5">Routine</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-1.5 space-y-1 text-[8px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#0284c7]/40 border border-[#0369a1]"></span>
            <span>Flood Extent (Sentinel-1 SAR)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2 rounded-full bg-red-500/20 border border-red-500/50"></span>
            <span>Priority Influence Zone</span>
          </div>
        </div>
      </div>

    </div>
  );
};

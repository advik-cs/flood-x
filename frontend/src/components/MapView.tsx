import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Compass, 
  Maximize2, 
  Minimize2, 
  Navigation,
  CheckCircle2,
  AlertTriangle,
  LifeBuoy,
  Home,
  Radio,
  Sliders
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

  // Layers state
  const [showSatellite, setShowSatellite] = useState(true);
  const [showFlood, setShowFlood] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showSos, setShowSos] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showDetections, setShowDetections] = useState(true);
  const [showAoi, setShowAoi] = useState(true);
  const [showSmoothRaster, setShowSmoothRaster] = useState(true);
  const [showPermanentWater, setShowPermanentWater] = useState(true);
  const [showSeverityZones, setShowSeverityZones] = useState(true);
  const [floodOpacity, setFloodOpacity] = useState(0.70);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Layer groups refs
  const baseTileRef = useRef<L.TileLayer | null>(null);
  const streetTileRef = useRef<L.TileLayer | null>(null);
  const floodLayerRef = useRef<L.GeoJSON | null>(null);
  const rasterLayerRef = useRef<L.ImageOverlay | null>(null);
  const roadsLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null);
  const resourcesLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const sosLayerRef = useRef<L.LayerGroup | null>(null);
  const detectionsLayerRef = useRef<L.LayerGroup | null>(null);
  const aoiLayerRef = useRef<L.Rectangle | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // 1. Initialize Map
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

    // Basemaps: ArcGIS World Imagery (Satellite) + Carto Voyager Labels
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );
    const streetOverlay = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19, opacity: 0.80 }
    );

    satLayer.addTo(map);
    streetOverlay.addTo(map);

    baseTileRef.current = satLayer;
    streetTileRef.current = streetOverlay;

    // Scale bar
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    // Zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Layer groups
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

  // 2. Center/Fit to Preset
  useEffect(() => {
    if (!mapRef.current || !preset) return;
    mapRef.current.setView(preset.center, preset.zoom);

    // Update AOI boundary
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
        opacity: 0.8
      }).addTo(mapRef.current);
      aoiLayerRef.current = rect;
    }
  }, [preset, showAoi]);

  // 3. Render Realistic Flood Visualization (Seamless GIS Polygons & Smooth Raster)
  useEffect(() => {
    if (!mapRef.current) return;

    if (floodLayerRef.current) {
      floodLayerRef.current.remove();
      floodLayerRef.current = null;
    }
    if (rasterLayerRef.current) {
      rasterLayerRef.current.remove();
      rasterLayerRef.current = null;
    }

    if (!showFlood || !sarResult || !sarResult.flood_geojson) return;

    // Render seamless GeoJSON with restrained GIS symbology
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

        // Professional restrained GIS symbology:
        // - Permanent water: Dark teal/cyan (#0f766e), low opacity (20-30%), subtle border
        // - SAR Flood Extent: Subtle blue/cyan (#0284c7), moderate opacity (25-35%), subtle darker border (#0369a1)
        // - High severity inundation: Deeper blue (#1d4ed8), opacity 35-42%, subtle darker border (#1e40af)
        // - Underlying satellite imagery remains clearly visible through the water layer
        if (isPermanent) {
          return {
            fillColor: '#0f766e',
            fillOpacity: Math.min(0.32, Math.max(0.18, floodOpacity * 0.35)),
            color: '#0d9488',
            weight: 1,
            opacity: 0.60
          };
        } else if (sev === 'high') {
          return {
            fillColor: '#1d4ed8',
            fillOpacity: Math.min(0.42, Math.max(0.28, floodOpacity * 0.50)),
            color: '#1e40af',
            weight: 1.2,
            opacity: 0.75
          };
        } else {
          return {
            fillColor: '#0284c7',
            fillOpacity: Math.min(0.35, Math.max(0.22, floodOpacity * 0.40)),
            color: '#0369a1',
            weight: 1.0,
            opacity: 0.65
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
        const badgeColor = isPermanent 
          ? 'text-teal-400' 
          : p.severity === 'high' 
          ? 'text-blue-400' 
          : 'text-sky-400';
        const deltaDb = p.delta_db ? `${p.delta_db} dB` : 'N/A';
        const area = p.area_km2 ? `${p.area_km2} km²` : 'Continuous Polygon';
        const sensor = p.sensor || 'Sentinel-1A C-SAR IW GRDH';
        const preDate = p.pre_event_time ? new Date(p.pre_event_time).toUTCString() : '2023-05-06 05:12 UTC';
        const postDate = p.post_event_time ? new Date(p.post_event_time).toUTCString() : '2023-05-18 05:12 UTC';
        const source = p.source || 'Copernicus Sentinel-1 (CDSE)';
        const procStatus = p.processing_status || 'Validated Copernicus EMS Inundation Delineation';

        // Hover Tooltip
        layer.bindTooltip(
          `<div class="p-1.5 font-mono text-[11px] leading-tight max-w-xs bg-slate-950/95 border border-slate-700 rounded shadow-lg text-slate-200">
            <div class="font-bold text-slate-100">${name}</div>
            <div class="flex items-center space-x-1 font-bold ${badgeColor} mt-0.5">
              <span>${classification}</span>
            </div>
            <div class="mt-1 text-slate-300 text-[10px] space-y-0.5 border-t border-slate-800 pt-0.5">
              <div>SAR &Delta; Backscatter: <b class="text-slate-100">${deltaDb}</b></div>
              <div>Estimated Extent: <b class="text-slate-100">${area}</b></div>
              <div class="text-[9px] text-sky-400 pt-0.5">Click polygon to inspect full telemetry probe</div>
            </div>
          </div>`,
          { sticky: true }
        );

        // Click Popup with Full Satellite Telemetry Probe
        layer.bindPopup(
          `<div class="p-2.5 font-mono text-[11px] leading-tight max-w-sm bg-slate-950 text-slate-100 rounded border border-slate-700 shadow-2xl">
            <div class="font-bold text-sm text-sky-300 border-b border-slate-800 pb-1.5">${name}</div>
            <div class="mt-2 space-y-1.5 text-[10px]">
              <div class="flex justify-between">
                <span class="text-slate-400">Classification:</span>
                <b class="${badgeColor}">${classification}</b>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Radar &Delta; Backscatter:</span>
                <b class="text-slate-200">${deltaDb}</b>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Delineated Polygon Area:</span>
                <b class="text-slate-200">${area}</b>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Satellite Sensor:</span>
                <span class="text-emerald-400 font-semibold">${sensor}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Pre-Event Acquisition:</span>
                <span class="text-slate-300">${preDate}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Post-Event Acquisition:</span>
                <span class="text-slate-300">${postDate}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Data Source:</span>
                <span class="text-emerald-300 font-semibold">${source}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Processing Status:</span>
                <span class="text-sky-300">${procStatus}</span>
              </div>
              <div class="mt-2 pt-1 border-t border-slate-800 text-[9px] text-slate-400 italic">
                Surface water extent derived via dual-pass radar specular backscatter attenuation. Display-generalized cartographic polygon.
              </div>
            </div>
          </div>`
        );
      }
    }).addTo(mapRef.current);

    floodLayerRef.current = floodGeo;
  }, [sarResult, showFlood, floodOpacity, showPermanentWater, showSeverityZones]);

  // 4. Render Roads & Blockage Icons
  useEffect(() => {
    if (!roadsLayerRef.current) return;
    roadsLayerRef.current.clearLayers();
    if (!showRoads) return;

    roads.forEach((road) => {
      const isBlocked = road.status === 'BLOCKED';
      const isPartial = road.status === 'PARTIALLY_BLOCKED';

      let color = '#16a34a'; // Open = Emerald
      if (isBlocked) color = '#dc2626'; // Blocked = Red
      else if (isPartial) color = '#ea580c'; // Partial = Orange

      const poly = L.polyline(road.coordinates, {
        color,
        weight: isBlocked ? 4.5 : 3.5,
        opacity: 0.9,
        dashArray: isBlocked ? '5, 5' : undefined
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

      // Add a small warning icon at midpoint of blocked road
      if (isBlocked && road.coordinates.length > 1) {
        const midIdx = Math.floor(road.coordinates.length / 2);
        const midPt = road.coordinates[midIdx];
        const blockIcon = L.divIcon({
          className: 'blocked-road-icon',
          html: `
            <div class="w-5 h-5 rounded bg-red-950 border border-red-600 flex items-center justify-center text-red-300 shadow">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        L.marker(midPt, { icon: blockIcon }).addTo(roadsLayerRef.current!);
      }
    });
  }, [roads, showRoads]);

  // 5. Render Incident Markers
  useEffect(() => {
    if (!incidentsLayerRef.current) return;
    incidentsLayerRef.current.clearLayers();

    incidents.forEach((inc) => {
      const isCritical = inc.priority === 'CRITICAL' || inc.severity === 'CRITICAL';
      const isSelected = selectedIncident?.incident_id === inc.incident_id;

      const markerHtml = `
        <div class="gis-marker-incident cursor-pointer">
          ${isCritical ? '<div class="absolute w-8 h-8 rounded-full bg-red-500/30 animate-subtle-pulse"></div>' : ''}
          <div class="w-7 h-7 rounded-full border-2 ${isSelected ? 'border-white ring-2 ring-blue-500 scale-110' : isCritical ? 'border-red-400 bg-red-700' : 'border-amber-400 bg-amber-700'} text-white flex items-center justify-center font-bold text-[10px] shadow-lg transition-transform">
            !
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'incident-marker-icon',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([inc.location.lat, inc.location.lng], { icon });

      marker.bindTooltip(
        `<div class="p-1 font-mono text-[11px] leading-tight">
          <div class="flex items-center space-x-1.5 font-bold mb-0.5">
            <span class="px-1.5 py-0.2 rounded text-[9px] ${isCritical ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">${inc.priority || inc.severity}</span>
            <span class="text-slate-100">${inc.incident_id}</span>
          </div>
          <div class="text-slate-300 font-semibold">${inc.name || inc.event}</div>
          <div class="mt-1 text-slate-400 text-[10px]">
            SOS Calls: <b>${inc.sos_reports || 0}</b> | Stranded: <b>${inc.people_detected || 0}</b> | Affected: <b>${inc.people_affected || 0}</b>
          </div>
        </div>`
      );

      marker.on('click', () => {
        if (onSelectIncident) onSelectIncident(inc);
      });

      marker.addTo(incidentsLayerRef.current!);
    });
  }, [incidents, selectedIncident, onSelectIncident]);

  // 6. Render Ground Detections (Stage 5 AI Drone Verification)
  useEffect(() => {
    if (!detectionsLayerRef.current) return;
    detectionsLayerRef.current.clearLayers();
    if (!showDetections || !droneDetections || droneDetections.length === 0) return;

    droneDetections.forEach((det) => {
      const isPerson = det.object_type === 'person';
      const isBoat = det.object_type === 'boat';

      let markerBg = 'bg-amber-700 border-amber-400';
      if (isPerson) markerBg = 'bg-cyan-700 border-cyan-400';
      else if (isBoat) markerBg = 'bg-blue-700 border-blue-400';

      const markerHtml = `
        <div class="gis-marker-person cursor-pointer">
          <div class="w-5 h-5 rounded-full border ${markerBg} text-white flex items-center justify-center text-[9px] font-bold shadow">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'detection-marker-icon',
        html: markerHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      // Position: derive from incident center or bbox offset
      const lat = (preset?.center[0] || 44.2885) + ((det.bbox[0] - 0.5) * 0.015);
      const lng = (preset?.center[1] || 11.8795) + ((det.bbox[1] - 0.5) * 0.020);

      const marker = L.marker([lat, lng], { icon });

      marker.bindTooltip(
        `<div class="font-mono text-[11px] leading-tight">
          <div class="flex items-center space-x-1.5 font-bold">
            <span class="px-1 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">${det.object_type}</span>
            <span class="text-slate-100">${det.id}</span>
          </div>
          <div class="mt-1 text-slate-300">
            Confidence: <b>${(det.confidence * 100).toFixed(0)}%</b><br/>
            Source: <span class="text-slate-400">MODEL-DERIVED AERIAL IMAGERY</span>
          </div>
        </div>`
      );

      marker.addTo(detectionsLayerRef.current!);
    });
  }, [droneDetections, showDetections, preset]);

  // 7. Render Resources (Fleet Assets)
  useEffect(() => {
    if (!resourcesLayerRef.current) return;
    resourcesLayerRef.current.clearLayers();
    if (!showResources) return;

    resources.forEach((res) => {
      const isAvailable = res.status === 'AVAILABLE';
      const isBoat = res.type === 'boat' || res.type === 'BOAT';

      const markerHtml = `
        <div class="gis-marker-resource">
          <div class="w-6 h-6 rounded border ${isAvailable ? 'border-emerald-500 bg-emerald-800' : 'border-slate-500 bg-slate-800'} text-white flex items-center justify-center shadow">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="${
                isBoat
                  ? 'M3 15l9 6 9-6M3 9l9 6 9-6M3 3l9 6 9-6'
                  : 'M13 10V3L4 14h7v7l9-11h-7z'
              }"></path>
            </svg>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'resource-marker',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([res.location.lat, res.location.lng], { icon });

      marker.bindTooltip(
        `<div class="font-mono text-[11px] leading-tight">
          <b class="text-emerald-400">${res.name}</b> (${res.type.toUpperCase()})<br/>
          Status: <b>${res.status}</b> | Cap: <b>${res.capacity}</b> | Spd: <b>${res.speed_kmh} km/h</b><br/>
          Staging: <span class="text-slate-400">${res.base_station}</span>
        </div>`
      );

      marker.addTo(resourcesLayerRef.current!);
    });
  }, [resources, showResources]);

  // 8. Render Shelters
  useEffect(() => {
    if (!sheltersLayerRef.current) return;
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

      const marker = L.marker([sh.location.lat, sh.location.lng], { icon });

      marker.bindTooltip(
        `<div class="font-mono text-[11px] leading-tight">
          <b class="text-sky-300">${sh.name}</b><br/>
          Occupancy: <b>${sh.current_occupancy} / ${sh.capacity}</b><br/>
          Supplies: <b>${sh.supplies_status}</b> | Medical: <b>${sh.has_medical_facility ? 'YES' : 'NO'}</b>
        </div>`
      );

      marker.addTo(sheltersLayerRef.current!);
    });
  }, [shelters, showShelters]);

  // 9. Render Citizen SOS Reports (Refined Red Beacon with subtle pulse)
  useEffect(() => {
    if (!sosLayerRef.current) return;
    sosLayerRef.current.clearLayers();
    if (!showSos) return;

    sosReports.forEach((s) => {
      const isCritical = s.severity === 'CRITICAL' || s.urgency === 'CRITICAL';
      const markerHtml = `
        <div class="gis-marker-sos cursor-pointer relative">
          ${isCritical ? '<div class="absolute w-7 h-7 rounded-full bg-red-500/40 animate-subtle-pulse"></div>' : ''}
          <div class="w-5 h-5 rounded-full border border-red-300 bg-red-600 text-white flex items-center justify-center text-[9px] font-bold shadow-md">
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

      const marker = L.marker([s.location.lat, s.location.lng], { icon });

      marker.bindTooltip(
        `<div class="font-mono text-[11px] max-w-xs leading-tight">
          <div class="flex items-center space-x-1 font-bold text-red-400 uppercase">
            <span>${s.category.replace(/_/g, ' ')}</span>
            <span class="text-[9px] text-slate-400 font-normal">(${s.id || s.sos_id})</span>
          </div>
          <div class="text-slate-200 mt-0.5">${s.description}</div>
          <div class="mt-1 text-slate-400 text-[10px]">
            Affected: <b>${s.people_affected || s.people_count || 1}</b> | Medical: <b class="${s.medical_urgency ? 'text-red-400' : 'text-slate-300'}">${s.medical_urgency ? 'YES' : 'NO'}</b>
          </div>
        </div>`
      );

      marker.addTo(sosLayerRef.current!);
    });
  }, [sosReports, showSos]);

  // 10. Active Route Polyline
  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (activeRoutePolyline && activeRoutePolyline.length > 1) {
      const line = L.polyline(activeRoutePolyline, {
        color: '#0284c7',
        weight: 5,
        opacity: 0.9,
        dashArray: '6, 6'
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(line.getBounds(), { padding: [40, 40] });
      routeLayerRef.current = line;
    }
  }, [activeRoutePolyline]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!isFullscreen) {
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Center on User Geolocation
  const handleGeolocation = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 13);
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
      }
    );
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Leaflet Map DOM */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#0a0e17]" />

      {/* Top Left: Navigation & Action Controls (Section 11) */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col space-y-1.5 pointer-events-auto font-mono">
        {/* Reset View Button */}
        <button
          onClick={() => mapRef.current?.setView(preset?.center || [44.35, 11.95], preset?.zoom || 11)}
          className="h-7 px-2 rounded bg-slate-900/95 border border-slate-700/80 flex items-center space-x-1.5 text-[10px] text-slate-300 hover:text-white shadow hover:bg-slate-800 transition cursor-pointer"
          title="Reset to AOI Extent"
        >
          <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-bold">RESET VIEW</span>
        </button>

        {/* Fit to Selected Incident Button */}
        <button
          onClick={() => {
            if (selectedIncident && mapRef.current) {
              mapRef.current.setView([selectedIncident.location.lat, selectedIncident.location.lng], 14);
            }
          }}
          disabled={!selectedIncident}
          className={`h-7 px-2 rounded border flex items-center space-x-1.5 text-[10px] shadow transition ${
            selectedIncident
              ? 'bg-slate-900/95 border-amber-600/80 text-amber-300 hover:bg-slate-800 hover:text-amber-200 cursor-pointer'
              : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title={selectedIncident ? `Fit to ${selectedIncident.incident_id}` : 'Select an incident to focus'}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-bold">FIT TO INCIDENT</span>
        </button>

        {/* Zoom to Flood Extent Button */}
        <button
          onClick={() => {
            if (floodLayerRef.current && mapRef.current) {
              const bounds = floodLayerRef.current.getBounds();
              if (bounds.isValid()) {
                mapRef.current.fitBounds(bounds, { padding: [30, 30] });
              }
            }
          }}
          disabled={!sarResult || !showFlood}
          className={`h-7 px-2 rounded border flex items-center space-x-1.5 text-[10px] shadow transition ${
            sarResult && showFlood
              ? 'bg-slate-900/95 border-sky-600/80 text-sky-300 hover:bg-slate-800 hover:text-sky-200 cursor-pointer'
              : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title="Zoom to Full SAR Flood Extent"
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-bold">ZOOM TO FLOOD</span>
        </button>

        <div className="flex space-x-1 pt-0.5">
          {/* Geolocation Button */}
          <button
            onClick={handleGeolocation}
            className="w-7 h-7 rounded bg-slate-900/95 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white shadow hover:bg-slate-800 transition cursor-pointer"
            title="Center on My Location"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
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
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-900/95 border border-slate-700 text-xs font-mono font-semibold text-slate-200 hover:bg-slate-800 shadow"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>LAYERS ({[showFlood, showRoads, showShelters, showSos, showResources, showDetections].filter(Boolean).length})</span>
        </button>

        {/* Expanded Unified Layer Panel (Section 7) */}
        {showLayerPanel && (
          <div className="mt-1.5 w-60 p-3 bg-slate-950/95 border border-slate-700 rounded shadow-2xl text-[11px] font-mono text-slate-300 space-y-2 backdrop-blur-md">
            <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex justify-between items-center text-[10px] tracking-wider uppercase">
              <span>GIS OPERATIONAL LAYERS</span>
              <span className="text-blue-400">COP V1.0</span>
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
                <span>Flood Inundation (SAR)</span>
              </span>
              <input 
                type="checkbox" 
                checked={showFlood} 
                onChange={(e) => setShowFlood(e.target.checked)} 
                className="accent-blue-500"
              />
            </label>

            {showFlood && (
              <div className="pl-3.5 space-y-1.5 pt-0.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Flood Layer Opacity</span>
                  <span>{Math.round(floodOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={floodOpacity}
                  onChange={(e) => setFloodOpacity(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1 bg-slate-800 rounded"
                />
                <label className="flex items-center justify-between cursor-pointer text-[10px] text-slate-300 py-0.5">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-sm bg-[#0f766e] border border-[#0d9488]"></span>
                    <span>Permanent Waterbodies</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showPermanentWater}
                    onChange={(e) => setShowPermanentWater(e.target.checked)}
                    className="accent-teal-500 scale-90"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-[10px] text-slate-300 py-0.5">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-sm bg-[#1d4ed8] border border-[#1e40af]"></span>
                    <span>High-Severity Breach Cores</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showSeverityZones}
                    onChange={(e) => setShowSeverityZones(e.target.checked)}
                    className="accent-blue-600 scale-90"
                  />
                </label>
              </div>
            )}

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                <span>Ground Detections (AI)</span>
              </span>
              <input 
                type="checkbox" 
                checked={showDetections} 
                onChange={(e) => setShowDetections(e.target.checked)} 
                className="accent-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
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

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 border border-dashed border-sky-400"></span>
                <span>AOI Bounding Box</span>
              </span>
              <input 
                type="checkbox" 
                checked={showAoi} 
                onChange={(e) => setShowAoi(e.target.checked)} 
                className="accent-blue-500"
              />
            </label>
          </div>
        )}
      </div>

      {/* Bottom Floating GIS Symbology Legend (Requirement 9: Professional EOC Standard) */}
      <div className="absolute bottom-4 right-3 z-[1000] p-3 bg-slate-950/95 border border-slate-800 rounded-md shadow-2xl text-[10px] font-mono text-slate-300 space-y-2 backdrop-blur-md pointer-events-auto max-w-xs">
        <div className="font-bold text-slate-200 text-[10px] tracking-wider uppercase border-b border-slate-800 pb-1.5 flex justify-between items-center">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>FLOOD INUNDATION</span>
          </span>
          <span className="text-slate-500 text-[8px] font-semibold">EOC STANDARD</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2.5 rounded-sm bg-[#0284c7]/40 border border-[#0369a1]"></span>
            <span className="text-slate-300">Flooded / Inundated</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2.5 rounded-sm bg-[#38bdf8]/40 border border-[#0284c7]"></span>
            <span className="text-slate-300">Moderate severity</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2.5 rounded-sm bg-[#1d4ed8]/50 border border-[#1e40af]"></span>
            <span className="text-slate-300">High severity</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2.5 rounded-sm bg-[#0f766e]/40 border border-[#0d9488]"></span>
            <span className="text-slate-300">Permanent water</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 border border-amber-300"></span>
            <span className="text-slate-300">Critical incident</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-0.5 bg-red-500 border-b border-dashed border-red-300"></span>
            <span className="text-slate-300">Blocked road</span>
          </div>
          <div className="flex items-center space-x-1.5 col-span-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-red-400/60 shrink-0"></span>
            <span className="text-slate-300">SOS / stranded person</span>
          </div>
        </div>
        <div className="border-t border-slate-800/80 pt-1 text-[8px] text-sky-400/90 tracking-tight flex items-center justify-between">
          <span>DISPLAY-GENERALIZED FLOOD EXTENT</span>
          <span className="text-slate-500 font-mono">Sentinel-1 SAR</span>
        </div>
      </div>
    </div>
  );
};
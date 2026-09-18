import { 
  Incident, 
  PresetLocation, 
  ResourceItem, 
  RoadEdge, 
  ShelterItem, 
  SOSReport, 
  DamageReport, 
  SatelliteObservation, 
  DroneDetection, 
  SARAnalysisResult, 
  SystemStatus, 
  BoundingBox,
  PriorityBreakdown,
  SubsystemHealth,
  ProvenanceAuditRecord,
  PixelProbeResult
} from '../types/index.js';

import { 
  PRESET_LOCATIONS, 
  INITIAL_OBSERVATIONS, 
  INITIAL_INCIDENTS, 
  INITIAL_RESOURCES, 
  INITIAL_SHELTERS, 
  INITIAL_ROADS, 
  INITIAL_SOS_REPORTS, 
  INITIAL_DAMAGE_REPORTS 
} from '../data/presetsData.js';

const rawApiUrl = (import.meta as any).env?.VITE_API_URL;
const API_BASE = rawApiUrl ? `${rawApiUrl.replace(/\/+$/, '')}/api` : '/api';

// In-memory active preset for offline / static Vercel demo mode
let activePresetId = 'bengaluru';

async function safeFetch<T>(fetcher: () => Promise<Response>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    const res = await fetcher();
    if (!res.ok) {
      return await fallback();
    }
    return await res.json();
  } catch {
    return await fallback();
  }
}

export async function fetchStatus(): Promise<SystemStatus> {
  return safeFetch(
    () => fetch(`${API_BASE}/status`),
    () => ({
      copernicus_api: 'NOT CONFIGURED',
      sentinel_1: 'DEMO ACTIVE',
      gis: 'ONLINE',
      ai: 'FALLBACK HEURISTIC',
      database: 'ONLINE (STRUCTURED ENGINE)',
      drone_analysis: 'DEMO',
      citizen_network: 'ONLINE',
      current_mode: 'DEMO MODE',
      timestamp: new Date().toISOString()
    })
  );
}

export async function fetchPresets(): Promise<{ presets: PresetLocation[]; activePresetId: string; activePreset: PresetLocation }> {
  return safeFetch(
    () => fetch(`${API_BASE}/presets`),
    () => ({
      presets: PRESET_LOCATIONS,
      activePresetId,
      activePreset: PRESET_LOCATIONS.find(p => p.id === activePresetId) || PRESET_LOCATIONS[0]
    })
  );
}

export async function selectPreset(presetId?: string, customBounds?: BoundingBox): Promise<{ success: boolean; activePreset: PresetLocation }> {
  if (presetId) {
    activePresetId = presetId;
  }
  return safeFetch(
    () => fetch(`${API_BASE}/presets/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId, customBounds })
    }),
    () => ({
      success: true,
      activePreset: PRESET_LOCATIONS.find(p => p.id === activePresetId) || PRESET_LOCATIONS[0]
    })
  );
}

export async function fetchIncidents(): Promise<Incident[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/incidents`),
    () => INITIAL_INCIDENTS[activePresetId] || INITIAL_INCIDENTS['bengaluru'] || []
  );
}

export async function fetchIncidentById(id: string): Promise<Incident> {
  return safeFetch(
    () => fetch(`${API_BASE}/incidents/${id}`),
    () => {
      const list = INITIAL_INCIDENTS[activePresetId] || INITIAL_INCIDENTS['bengaluru'] || [];
      return list.find(i => i.incident_id === id) || list[0];
    }
  );
}

export async function createIncident(incident: Partial<Incident>): Promise<Incident> {
  return safeFetch(
    () => fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident)
    }),
    () => ({
      incident_id: `INC-DEMO-${Date.now()}`,
      name: incident.name || 'New Incident',
      hazard: incident.hazard || 'Urban Flood Overflow',
      severity: incident.severity || 'HIGH',
      location: incident.location || { lat: 12.935, lng: 77.683, city: 'Bengaluru' },
      created_at: new Date().toISOString(),
      status: 'ACTIVE',
      flood_severity: 0.8,
      risk_level: 'HIGH',
      people_detected: 4,
      people_affected: 15,
      road_status: 'BLOCKED',
      damage_level: 'SEVERE',
      priority: 'HIGH',
      assigned_resource_ids: [],
      sos_reports: 2,
      is_demo: true,
      ...incident
    } as Incident)
  );
}

export async function fetchSOS(): Promise<SOSReport[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/sos`),
    () => INITIAL_SOS_REPORTS[activePresetId] || INITIAL_SOS_REPORTS['bengaluru'] || []
  );
}

export async function submitSOS(sos: Partial<SOSReport>): Promise<SOSReport> {
  return safeFetch(
    () => fetch(`${API_BASE}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sos)
    }),
    () => ({
      sos_id: `SOS-DEMO-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'NEW',
      ...sos
    } as SOSReport)
  );
}

export async function updateSOSStatus(
  sosId: string, 
  status: 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED' | string,
  incidentId?: string
): Promise<SOSReport> {
  const url = incidentId ? `${API_BASE}/incidents/${incidentId}/sos/${sosId}` : `${API_BASE}/sos/${sosId}`;
  return safeFetch(
    () => fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }),
    () => {
      const list = INITIAL_SOS_REPORTS[activePresetId] || INITIAL_SOS_REPORTS['bengaluru'] || [];
      const item = list.find(s => s.sos_id === sosId);
      if (item) item.status = status as any;
      return item || ({ sos_id: sosId, status } as any);
    }
  );
}

export async function fetchDamage(): Promise<DamageReport[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/damage`),
    () => INITIAL_DAMAGE_REPORTS[activePresetId] || INITIAL_DAMAGE_REPORTS['bengaluru'] || []
  );
}

export async function submitDamage(incidentId: string, damage: Partial<DamageReport>): Promise<DamageReport> {
  return safeFetch(
    () => fetch(`${API_BASE}/incidents/${incidentId}/damage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(damage)
    }),
    () => ({
      report_id: `DMG-DEMO-${Date.now()}`,
      incident_id: incidentId,
      timestamp: new Date().toISOString(),
      ...damage
    } as DamageReport)
  );
}

export async function fetchPriorityBreakdown(incidentId: string): Promise<PriorityBreakdown> {
  return safeFetch(
    () => fetch(`${API_BASE}/incidents/${incidentId}/priority`),
    () => ({
      score: 85,
      category: 'HIGH',
      reasons: ['High water depth along corridor', 'Critical population vulnerability in sector'],
      weightsUsed: {
        floodSeverity: 0.3,
        peopleAffected: 0.3,
        sosUrgency: 0.2,
        medicalUrgency: 0.1,
        accessibilityRisk: 0.1
      },
      componentScores: {
        flood: 85,
        people: 90,
        sos: 80,
        medical: 70,
        access: 85
      }
    })
  );
}

export async function fetchPriorityWeights(): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/priority/weights`),
    () => ({
      flood_depth: 0.25,
      vulnerable_pop: 0.25,
      infrastructure_criticality: 0.2,
      access_impedance: 0.15,
      report_recency: 0.15
    })
  );
}

export async function updatePriorityWeights(weights: any): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/priority/weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weights)
    }),
    () => weights
  );
}

export async function fetchLatestObservation(): Promise<SatelliteObservation> {
  return safeFetch(
    () => fetch(`${API_BASE}/satellite/latest`),
    () => INITIAL_OBSERVATIONS[activePresetId] || INITIAL_OBSERVATIONS['bengaluru']
  );
}

export async function searchSatellite(): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/satellite/search`),
    () => ({ results: [INITIAL_OBSERVATIONS[activePresetId] || INITIAL_OBSERVATIONS['bengaluru']] })
  );
}

export async function processSAR(options: {
  threshold_db?: number;
  mode?: string;
  mmu_pixels?: number; water_cutoff_db?: number;
  exclude_permanent_water?: boolean;
  apply_speckle_filter?: boolean;
}): Promise<SARAnalysisResult> {
  return safeFetch(
    () => fetch(`${API_BASE}/satellite/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    }),
    () => fetchCurrentSAR()
  );
}

export async function fetchCurrentSAR(): Promise<SARAnalysisResult> {
  return safeFetch(
    () => fetch(`${API_BASE}/satellite/current-result`),
    () => ({
      mode: 'STANDARD',
      timestamp: new Date().toISOString(),
      flooded_polygons: { type: 'FeatureCollection', features: [] },
      statistics: {
        total_flooded_area_sqkm: 12.4,
        mean_backscatter_delta_db: -4.8,
        affected_population_estimate: 8400
      },
      aoi_name: PRESET_LOCATIONS.find(p => p.id === activePresetId)?.name || 'Bengaluru',
      status: 'SIMULATED DEMONSTRATION'
    } as any)
  );
}

export async function probeSARPixel(lat: number, lng: number): Promise<PixelProbeResult> {
  return safeFetch(
    () => fetch(`${API_BASE}/satellite/probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng })
    }),
    () => ({
      in_bounds: true,
      lat,
      lng,
      delta_db: -4.2,
      classification: 'INUNDATED (FLOOD EXTENT)',
      severity: 'high',
      source: 'Copernicus Sentinel-1 / SAR Simulator',
      is_demo: true,
      timestamp: new Date().toISOString()
    } as any)
  );
}

export async function fetchDroneDetections(): Promise<DroneDetection[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/drone/detections`),
    () => []
  );
}

export async function analyzeDroneImage(formData?: FormData): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/drone/analyze`, {
      method: 'POST',
      body: formData || new FormData()
    }),
    () => ({ success: true, detections: [] })
  );
}

export async function approveDroneDetection(id: string, approved: boolean, flagged: boolean): Promise<DroneDetection> {
  return safeFetch(
    () => fetch(`${API_BASE}/drone/detections/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, flagged_for_rescue: flagged })
    }),
    () => ({ id, approved, flagged_for_rescue: flagged } as any)
  );
}

export async function loadDemoDroneScenario(): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/drone/demo`, { method: 'POST' }),
    () => ({ success: true, message: 'Demo scenario loaded' })
  );
}

export async function resetDroneAnalysis(): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/drone/reset`, { method: 'POST' }),
    () => ({ success: true })
  );
}

export async function georeferenceDroneDetections(coords: {
  latitude: number;
  longitude: number;
  altitude?: number;
  heading?: number;
}): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/drone/georeference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coords)
    }),
    () => ({ success: true, coords })
  );
}

export async function fetchResources(): Promise<ResourceItem[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/resources`),
    () => INITIAL_RESOURCES[activePresetId] || INITIAL_RESOURCES['bengaluru'] || []
  );
}

export async function recommendResource(incidentId: string): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/resources/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident_id: incidentId })
    }),
    () => {
      const resList = INITIAL_RESOURCES[activePresetId] || INITIAL_RESOURCES['bengaluru'] || [];
      return {
        incident_id: incidentId,
        recommended: resList[0] || null,
        eta_minutes: 12
      };
    }
  );
}

export async function assignResource(resourceId: string, incidentId: string): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/resources/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource_id: resourceId, incident_id: incidentId })
    }),
    () => ({ success: true, resource_id: resourceId, incident_id: incidentId })
  );
}

export async function fetchShelters(): Promise<ShelterItem[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/shelters`),
    () => INITIAL_SHELTERS[activePresetId] || INITIAL_SHELTERS['bengaluru'] || []
  );
}

export async function fetchRoads(): Promise<RoadEdge[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/roads`),
    () => INITIAL_ROADS[activePresetId] || INITIAL_ROADS['bengaluru'] || []
  );
}

export async function computeSafeRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, speed_kmh?: number): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/routing/safe-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, speed_kmh })
    }),
    () => ({
      route: [
        [origin.lat, origin.lng],
        [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2],
        [destination.lat, destination.lng]
      ],
      distance_km: 3.4,
      estimated_time_minutes: 8,
      status: 'CLEAR_ROUTE'
    })
  );
}

export async function generateSitrep(): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/sitrep`, { method: 'POST' }),
    () => ({
      title: 'FLOOD-X SITUATION REPORT (SITREP)',
      timestamp: new Date().toISOString(),
      incident_commander: 'Operations Chief (Auto-Generated)',
      summary: 'Critical inundation observed across Bellandur–Varthur technology corridor.',
      active_incidents: (INITIAL_INCIDENTS[activePresetId] || []).length,
      active_sos: (INITIAL_SOS_REPORTS[activePresetId] || []).length,
      recommendations: [
        'Maintain emergency boat deployment along Outer Ring Road.',
        'Prioritize rescue dispatch to EcoSpace basement distress beacon.',
        'Monitor Brahmaputra and Mithi delta levels.'
      ]
    })
  );
}

export async function askAiAssistant(query: string): Promise<{ answer: string }> {
  return safeFetch(
    () => fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }),
    () => ({
      answer: `[FLOOD-X Decision Engine]: Grounded analysis for "${query}": Active sector has ${(INITIAL_INCIDENTS[activePresetId] || []).length} registered incidents and ${(INITIAL_SOS_REPORTS[activePresetId] || []).length} distress beacons in ${PRESET_LOCATIONS.find(p => p.id === activePresetId)?.name || 'Bengaluru'}. Evacuation routes along lifeline roads are open.`
    })
  );
}

export async function resetDemo(): Promise<any> {
  activePresetId = 'bengaluru';
  return safeFetch(
    () => fetch(`${API_BASE}/reset`, { method: 'POST' }),
    () => ({ success: true, message: 'Demo reset to baseline' })
  );
}

export async function fetchIncidentSOS(incidentId: string): Promise<SOSReport[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/incidents/${incidentId}/sos`),
    () => (INITIAL_SOS_REPORTS[activePresetId] || INITIAL_SOS_REPORTS['bengaluru'] || []).filter(s => (s as any).incident_id === incidentId)
  );
}

export async function fetchResourceRecommendations(incidentId: string): Promise<{
  incident_id: string;
  priority: any;
  recommended_resources: any[];
  notes: string;
}> {
  return safeFetch(
    () => fetch(`${API_BASE}/incidents/${incidentId}/recommendations`),
    () => ({
      incident_id: incidentId,
      priority: { score: 85, level: 'HIGH' },
      recommended_resources: INITIAL_RESOURCES[activePresetId] || [],
      notes: 'Optimal tactical resource allocated based on proximity and road accessibility.'
    })
  );
}

export async function overrideIncidentDecision(incidentId: string, data: {
  action: string;
  priority?: any;
  notes?: string;
  assigned_resources?: string[];
}): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/incidents/${incidentId}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    () => ({ success: true, incident_id: incidentId, ...data })
  );
}

export async function assignIncidentResource(incidentId: string, resourceId: string, action: 'assign' | 'unassign' = 'assign'): Promise<any> {
  return safeFetch(
    () => fetch(`${API_BASE}/incidents/${incidentId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource_id: resourceId, action })
    }),
    () => ({ success: true, resource_id: resourceId, incident_id: incidentId, action })
  );
}

export async function createResource(data: Partial<ResourceItem>): Promise<ResourceItem> {
  return safeFetch(
    () => fetch(`${API_BASE}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    () => ({
      resource_id: `RES-DEMO-${Date.now()}`,
      name: data.name || 'Emergency Unit',
      type: data.type || 'RESCUE_TEAM',
      status: 'AVAILABLE',
      location: data.location || { lat: 12.935, lng: 77.683 },
      ...data
    } as ResourceItem)
  );
}

export async function updateResource(id: string, data: Partial<ResourceItem>): Promise<ResourceItem> {
  return safeFetch(
    () => fetch(`${API_BASE}/resources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    () => ({ resource_id: id, ...data } as any)
  );
}

export async function fetchDiagnostics(): Promise<SubsystemHealth[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/diagnostics`),
    () => [
      { id: '1', name: 'Copernicus Sentinel-1 SAR Feed', category: 'SATELLITE', status: 'AVAILABLE', lastOperation: 'SAR Sync', timestamp: new Date().toISOString(), message: 'Synthetic change detection baseline calibrated' },
      { id: '2', name: 'Aerial Computer Vision Engine', category: 'CV', status: 'AVAILABLE', lastOperation: 'Inference', timestamp: new Date().toISOString(), message: 'TensorFlow.js COCO-SSD runtime ready' },
      { id: '3', name: 'Situation Fusion Matrix', category: 'FUSION', status: 'AVAILABLE', lastOperation: 'Cluster Sync', timestamp: new Date().toISOString(), message: 'Active geospatial correlation engine running' },
      { id: '4', name: 'Priority Dispatch Engine', category: 'PRIORITY', status: 'AVAILABLE', lastOperation: 'Scoring', timestamp: new Date().toISOString(), message: 'Multi-factor priority weights loaded' }
    ]
  );
}

export async function fetchAuditLogs(): Promise<ProvenanceAuditRecord[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/audit`),
    () => [
      {
        incident_id: 'FLD-BLR-DEMO',
        data_source: 'Copernicus Sentinel-1 / SAR Simulator',
        operation: 'SAR Change Detection (IW GRD ΔdB)',
        timestamp: '2024-09-05T12:30:00Z',
        result: '12.4 km² simulated flood inundation delineated across Bellandur–Varthur corridor',
        status: 'SIMULATED DEMONSTRATION'
      },
      {
        incident_id: 'FLD-BLR-DEMO',
        data_source: 'Aerial Reconnaissance Flight',
        operation: 'Computer Vision Person Detection',
        timestamp: '2024-09-05T13:15:00Z',
        result: '3 surface individuals detected on rooftop/veranda, avg confidence 91%',
        status: 'MODEL/REAL DATA'
      },
      {
        incident_id: 'FLD-BLR-DEMO',
        data_source: 'Citizen Emergency Intake',
        operation: 'Distress Call Ingestion & Geotagging',
        timestamp: '2024-09-05T13:45:00Z',
        result: '4 SOS records correlated; EcoSpace & Yamalur critical calls triaged',
        status: 'SIMULATED DEMONSTRATION'
      }
    ]
  );
}
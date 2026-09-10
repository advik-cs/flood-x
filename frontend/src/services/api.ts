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

const API_BASE = '/api';

export async function fetchStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE}/status`);
  return res.json();
}

export async function fetchPresets(): Promise<{ presets: PresetLocation[]; activePresetId: string; activePreset: PresetLocation }> {
  const res = await fetch(`${API_BASE}/presets`);
  return res.json();
}

export async function selectPreset(presetId?: string, customBounds?: BoundingBox): Promise<{ success: boolean; activePreset: PresetLocation }> {
  const res = await fetch(`${API_BASE}/presets/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presetId, customBounds })
  });
  return res.json();
}

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/incidents`);
  return res.json();
}

export async function fetchIncidentById(id: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  return res.json();
}

export async function createIncident(incident: Partial<Incident>): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incident)
  });
  return res.json();
}

export async function fetchSOS(): Promise<SOSReport[]> {
  const res = await fetch(`${API_BASE}/sos`);
  return res.json();
}

export async function submitSOS(sos: Partial<SOSReport>): Promise<SOSReport> {
  const res = await fetch(`${API_BASE}/sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sos)
  });
  return res.json();
}

export async function updateSOSStatus(
  sosId: string, 
  status: 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED' | string,
  incidentId?: string
): Promise<SOSReport> {
  const url = incidentId ? `${API_BASE}/incidents/${incidentId}/sos/${sosId}` : `${API_BASE}/sos/${sosId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
}

export async function fetchDamage(): Promise<DamageReport[]> {
  const res = await fetch(`${API_BASE}/damage`);
  return res.json();
}

export async function submitDamage(incidentId: string, damage: Partial<DamageReport>): Promise<DamageReport> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/damage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(damage)
  });
  return res.json();
}

export async function fetchPriorityBreakdown(incidentId: string): Promise<PriorityBreakdown> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/priority`);
  return res.json();
}

export async function fetchPriorityWeights(): Promise<any> {
  const res = await fetch(`${API_BASE}/priority/weights`);
  return res.json();
}

export async function updatePriorityWeights(weights: any): Promise<any> {
  const res = await fetch(`${API_BASE}/priority/weights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weights)
  });
  return res.json();
}

export async function fetchLatestObservation(): Promise<SatelliteObservation> {
  const res = await fetch(`${API_BASE}/satellite/latest`);
  return res.json();
}

export async function searchSatellite(): Promise<any> {
  const res = await fetch(`${API_BASE}/satellite/search`);
  return res.json();
}

export async function processSAR(options: {
  threshold_db?: number;
  mode?: string;
  mmu_pixels?: number; water_cutoff_db?: number;
  exclude_permanent_water?: boolean;
  apply_speckle_filter?: boolean;
}): Promise<SARAnalysisResult> {
  const res = await fetch(`${API_BASE}/satellite/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  return res.json();
}

export async function fetchCurrentSAR(): Promise<SARAnalysisResult> {
  const res = await fetch(`${API_BASE}/satellite/current-result`);
  return res.json();
}

export async function probeSARPixel(lat: number, lng: number): Promise<PixelProbeResult> {
  const res = await fetch(`${API_BASE}/satellite/probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng })
  });
  return res.json();
}

export async function fetchDroneDetections(): Promise<DroneDetection[]> {
  const res = await fetch(`${API_BASE}/drone/detections`);
  return res.json();
}

export async function analyzeDroneImage(formData?: FormData): Promise<any> {
  const res = await fetch(`${API_BASE}/drone/analyze`, {
    method: 'POST',
    body: formData || new FormData()
  });
  return res.json();
}

export async function approveDroneDetection(id: string, approved: boolean, flagged: boolean): Promise<DroneDetection> {
  const res = await fetch(`${API_BASE}/drone/detections/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, flagged_for_rescue: flagged })
  });
  return res.json();
}

export async function fetchResources(): Promise<ResourceItem[]> {
  const res = await fetch(`${API_BASE}/resources`);
  return res.json();
}

export async function recommendResource(incidentId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/resources/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident_id: incidentId })
  });
  return res.json();
}

export async function assignResource(resourceId: string, incidentId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/resources/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource_id: resourceId, incident_id: incidentId })
  });
  return res.json();
}

export async function fetchShelters(): Promise<ShelterItem[]> {
  const res = await fetch(`${API_BASE}/shelters`);
  return res.json();
}

export async function fetchRoads(): Promise<RoadEdge[]> {
  const res = await fetch(`${API_BASE}/roads`);
  return res.json();
}

export async function computeSafeRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, speed_kmh?: number): Promise<any> {
  const res = await fetch(`${API_BASE}/routing/safe-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination, speed_kmh })
  });
  return res.json();
}

export async function generateSitrep(): Promise<any> {
  const res = await fetch(`${API_BASE}/sitrep`, {
    method: 'POST'
  });
  return res.json();
}

export async function askAiAssistant(query: string): Promise<{ answer: string }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return res.json();
}

export async function resetDemo(): Promise<any> {
  const res = await fetch(`${API_BASE}/reset`, {
    method: 'POST'
  });
  return res.json();
}

export async function fetchIncidentSOS(incidentId: string): Promise<SOSReport[]> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/sos`);
  return res.json();
}

export async function fetchResourceRecommendations(incidentId: string): Promise<{
  incident_id: string;
  priority: any;
  recommended_resources: any[];
  notes: string;
}> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/recommendations`);
  return res.json();
}

export async function overrideIncidentDecision(incidentId: string, data: {
  action: string;
  priority?: any;
  notes?: string;
  assigned_resources?: string[];
}): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function assignIncidentResource(incidentId: string, resourceId: string, action: 'assign' | 'unassign' = 'assign'): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource_id: resourceId, action })
  });
  return res.json();
}

export async function createResource(data: Partial<ResourceItem>): Promise<ResourceItem> {
  const res = await fetch(`${API_BASE}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updateResource(id: string, data: Partial<ResourceItem>): Promise<ResourceItem> {
  const res = await fetch(`${API_BASE}/resources/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchDiagnostics(): Promise<SubsystemHealth[]> {
  const res = await fetch(`${API_BASE}/diagnostics`);
  return res.json();
}

export async function fetchAuditLogs(): Promise<ProvenanceAuditRecord[]> {
  const res = await fetch(`${API_BASE}/audit`);
  return res.json();
}
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
  SubsystemHealth,
  ProvenanceAuditRecord,
  BoundingBox
} from '../types.js';
import { 
  PRESET_LOCATIONS, 
  INITIAL_OBSERVATIONS, 
  INITIAL_INCIDENTS, 
  INITIAL_RESOURCES, 
  INITIAL_SHELTERS, 
  INITIAL_ROADS, 
  INITIAL_SOS_REPORTS, 
  INITIAL_DAMAGE_REPORTS 
} from './presetsData.js';
import { fusionEngine } from '../services/fusionEngine.js';
import { sarProcessor } from '../services/sarProcessor.js';
import { priorityEngine, DEFAULT_WEIGHTS } from '../services/priorityEngine.js';
import { copernicusService } from '../services/copernicusService.js';
import { geminiService } from '../services/geminiService.js';
import { visionService } from '../services/visionService.js';

export class Store {
  private currentPresetId: string = 'bengaluru';
  private customBounds: BoundingBox | null = null;
  
  private incidents: Map<string, Incident[]> = new Map();
  private resources: Map<string, ResourceItem[]> = new Map();
  private shelters: Map<string, ShelterItem[]> = new Map();
  private roads: Map<string, RoadEdge[]> = new Map();
  private sosReports: Map<string, SOSReport[]> = new Map();
  private damageReports: Map<string, DamageReport[]> = new Map();
  private droneDetections: DroneDetection[] = [];
  private sarResults: Map<string, SARAnalysisResult> = new Map();
  private auditLogs: ProvenanceAuditRecord[] = [];

  constructor() {
    this.resetAll();
  }

  public resetAll() {
    // Deep clone initial presets
    for (const preset of PRESET_LOCATIONS) {
      const pid = preset.id;
      this.incidents.set(pid, JSON.parse(JSON.stringify(INITIAL_INCIDENTS[pid] || [])));
      this.resources.set(pid, JSON.parse(JSON.stringify(INITIAL_RESOURCES[pid] || [])));
      this.shelters.set(pid, JSON.parse(JSON.stringify(INITIAL_SHELTERS[pid] || [])));
      this.roads.set(pid, JSON.parse(JSON.stringify(INITIAL_ROADS[pid] || [])));
      this.sosReports.set(pid, JSON.parse(JSON.stringify(INITIAL_SOS_REPORTS[pid] || [])));
      this.damageReports.set(pid, JSON.parse(JSON.stringify(INITIAL_DAMAGE_REPORTS[pid] || [])));

      // Pre-compute initial SAR analysis
      const sar = sarProcessor.process({
        aoi_name: preset.name,
        bounds: preset.bounds,
        mode: 'STANDARD'
      });
      this.sarResults.set(pid, sar);

      // Initial fusion
      this.runFusion(pid);
    }

    // Initialize deterministic demo aerial reconnaissance detections
    this.droneDetections = visionService.getDemoDetections('IMG-DEMO-AERIAL');

    this.auditLogs = [
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
      },
      {
        incident_id: 'FLD-BLR-DEMO',
        data_source: 'Priority Decision Engine',
        operation: 'Multi-Factor Explainable Scoring',
        timestamp: '2024-09-05T14:00:00Z',
        result: 'Priority score computed: 94/100 (CRITICAL tier)',
        status: 'COMPLETED'
      },
      {
        incident_id: 'FLD-BLR-DEMO',
        data_source: 'Ground Survey & BBMP Emergency Bureau',
        operation: 'Post-Flood Infrastructure Assessment',
        timestamp: '2024-09-05T15:15:00Z',
        result: 'EcoSpace transformer yard flooded, Yamalur Rajakaluve 45m breach mapped',
        status: 'SIMULATED DEMONSTRATION'
      }
    ];
  }

  public getPresets(): PresetLocation[] {
    return PRESET_LOCATIONS;
  }

  public getCurrentPresetId(): string {
    return this.currentPresetId;
  }

  public getCurrentPreset(): PresetLocation {
    return PRESET_LOCATIONS.find(p => p.id === this.currentPresetId) || PRESET_LOCATIONS[0];
  }

  public setPreset(presetId: string): PresetLocation {
    const found = PRESET_LOCATIONS.find(p => p.id === presetId);
    if (found) {
      this.currentPresetId = presetId;
      this.customBounds = null;
      return found;
    }
    return this.getCurrentPreset();
  }

  public setCustomBounds(bounds: BoundingBox): PresetLocation {
    this.customBounds = bounds;
    this.currentPresetId = 'custom';
    const customPreset: PresetLocation = {
      id: 'custom',
      name: 'Custom Bounding Box Area',
      country: 'Global / Regional',
      center: [(bounds.north + bounds.south) / 2, (bounds.east + bounds.west) / 2],
      zoom: 11,
      bounds,
      description: `Manual bounding box: [${bounds.north}, ${bounds.south}, ${bounds.west}, ${bounds.east}]`,
      is_demo: true
    };
    
    // Ensure data collections exist
    if (!this.incidents.has('custom')) this.incidents.set('custom', []);
    if (!this.resources.has('custom')) this.resources.set('custom', []);
    if (!this.shelters.has('custom')) this.shelters.set('custom', []);
    if (!this.roads.has('custom')) this.roads.set('custom', []);
    if (!this.sosReports.has('custom')) this.sosReports.set('custom', []);
    if (!this.damageReports.has('custom')) this.damageReports.set('custom', []);

    return customPreset;
  }

  public getIncidents(presetId = this.currentPresetId): Incident[] {
    return this.incidents.get(presetId) || [];
  }

  public getIncidentById(id: string): Incident | undefined {
    const normalizedId = (id === 'FLD-001' || id === 'FLD-BLR-001') ? 'FLD-BLR-DEMO' : (id === 'FLD-EMR-001' ? 'FLD-EMR-2023' : id);
    for (const list of this.incidents.values()) {
      const found = list.find(i => i.incident_id === normalizedId || i.incident_id === id);
      if (found) return found;
    }
    return undefined;
  }

  public addIncident(incident: Incident, presetId = this.currentPresetId): Incident {
    const list = this.getIncidents(presetId);
    list.push(incident);
    this.incidents.set(presetId, list);
    this.runFusion(presetId);
    return incident;
  }

  public updateIncident(incident: Incident, presetId = this.currentPresetId): Incident {
    const list = this.getIncidents(presetId);
    const index = list.findIndex(i => i.incident_id === incident.incident_id);
    if (index >= 0) {
      list[index] = incident;
      this.incidents.set(presetId, list);
    }
    return incident;
  }

  public getSOSReports(presetId = this.currentPresetId): SOSReport[] {
    return this.sosReports.get(presetId) || [];
  }

  public getSOSByIncidentId(incidentId: string): SOSReport[] {
    const normalizedId = (incidentId === 'FLD-001' || incidentId === 'FLD-BLR-001') ? 'FLD-BLR-DEMO' : (incidentId === 'FLD-EMR-001' ? 'FLD-EMR-2023' : incidentId);
    const all = this.getSOSReports();
    return all.filter(s => s.incident_id === normalizedId || s.incident_id === incidentId);
  }

  public getSOSById(id: string): SOSReport | undefined {
    for (const list of this.sosReports.values()) {
      const found = list.find(s => s.sos_id === id || s.id === id);
      if (found) return found;
    }
    return undefined;
  }

  public addSOSReport(report: SOSReport, presetId = this.currentPresetId): SOSReport {
    const list = this.getSOSReports(presetId);
    list.unshift(report);
    this.sosReports.set(presetId, list);
    this.runFusion(presetId);
    return report;
  }

  public updateSOSReport(id: string, updates: Partial<SOSReport>): SOSReport | null {
    for (const [pid, list] of this.sosReports.entries()) {
      const idx = list.findIndex(s => s.sos_id === id || s.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
        if (updates.urgency) list[idx].severity = updates.urgency;
        if (updates.severity) list[idx].urgency = updates.severity as any;
        if (updates.people_count !== undefined) list[idx].people_affected = updates.people_count;
        this.sosReports.set(pid, list);
        this.runFusion(pid);
        return list[idx];
      }
    }
    return null;
  }

  public getDamageReports(presetId = this.currentPresetId): DamageReport[] {
    return this.damageReports.get(presetId) || [];
  }

  public addDamageReport(report: DamageReport, presetId = this.currentPresetId): DamageReport {
    const list = this.getDamageReports(presetId);
    list.unshift(report);
    this.damageReports.set(presetId, list);
    this.runFusion(presetId);
    return report;
  }

  public getResources(presetId = this.currentPresetId): ResourceItem[] {
    return this.resources.get(presetId) || [];
  }

  public updateResource(id: string, updates: Partial<ResourceItem>): ResourceItem | null {
    for (const [pid, list] of this.resources.entries()) {
      const idx = list.findIndex(r => r.resource_id === id || r.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
        if (updates.availability) list[idx].status = updates.availability;
        if (updates.status) list[idx].availability = (updates.status === 'AVAILABLE' ? 'AVAILABLE' : updates.status === 'ASSIGNED' ? 'ASSIGNED' : updates.status === 'RESERVED' ? 'RESERVED' : 'UNAVAILABLE');
        this.resources.set(pid, list);
        return list[idx];
      }
    }
    return null;
  }

  public assignResource(resourceId: string, incidentId: string, presetId = this.currentPresetId): boolean {
    const resList = this.getResources(presetId);
    const targetRes = resList.find(r => r.id === resourceId);
    const incList = this.getIncidents(presetId);
    const targetInc = incList.find(i => i.incident_id === incidentId);

    if (!targetRes || !targetInc) return false;

    targetRes.status = 'EN_ROUTE';
    targetRes.assigned_incident_id = incidentId;
    if (!targetInc.assigned_resource_ids.includes(resourceId)) {
      targetInc.assigned_resource_ids.push(resourceId);
    }
    return true;
  }

  public getShelters(presetId = this.currentPresetId): ShelterItem[] {
    return this.shelters.get(presetId) || [];
  }

  public getRoads(presetId = this.currentPresetId): RoadEdge[] {
    return this.roads.get(presetId) || [];
  }

  public getDroneDetections(): DroneDetection[] {
    return this.droneDetections;
  }

  public setDroneDetections(detections: DroneDetection[]): void {
    this.droneDetections = detections;
    this.runFusion(this.currentPresetId);
  }

  public addDroneDetections(detections: DroneDetection[]): void {
    this.droneDetections = [...detections, ...this.droneDetections];
    this.runFusion(this.currentPresetId);
  }

  public updateDroneDetection(id: string, updates: Partial<DroneDetection>): DroneDetection | null {
    const index = this.droneDetections.findIndex(d => d.id === id);
    if (index >= 0) {
      this.droneDetections[index] = { ...this.droneDetections[index], ...updates };
      this.runFusion(this.currentPresetId);
      return this.droneDetections[index];
    }
    return null;
  }

  public getSARResult(presetId = this.currentPresetId): SARAnalysisResult | undefined {
    return this.sarResults.get(presetId);
  }

  public setSARResult(result: SARAnalysisResult, presetId = this.currentPresetId): void {
    this.sarResults.set(presetId, result);
    this.runFusion(presetId);
  }

  public runFusion(presetId = this.currentPresetId): Incident[] {
    const existing = this.getIncidents(presetId);
    const sar = this.getSARResult(presetId);
    const sos = this.getSOSReports(presetId);
    const damage = this.getDamageReports(presetId);
    const roads = this.getRoads(presetId);
    const shelters = this.getShelters(presetId);
    const resources = this.getResources(presetId);

    const fused = fusionEngine.fuse({
      presetId,
      sarAnalysis: sar,
      sosReports: sos,
      droneDetections: this.droneDetections,
      damageReports: damage,
      roads,
      shelters,
      resources
    }, existing);

    this.incidents.set(presetId, fused);
    return fused;
  }

  public getSystemStatus(): SystemStatus {
    const copStatus = copernicusService.getStatus();
    const isGeminiLive = geminiService.isConfigured();

    return {
      copernicus_api: copStatus,
      sentinel_1: copStatus === 'AUTHENTICATED' ? 'AVAILABLE' : 'DEMO ACTIVE',
      gis: 'ONLINE',
      ai: isGeminiLive ? 'ONLINE' : 'FALLBACK HEURISTIC',
      database: 'ONLINE (STRUCTURED ENGINE)',
      drone_analysis: 'AVAILABLE',
      citizen_network: 'ONLINE',
      current_mode: copStatus === 'AUTHENTICATED' ? 'LIVE DATA' : 'DEMO MODE',
      timestamp: new Date().toISOString()
    };
  }

  public getAuditLogs(): ProvenanceAuditRecord[] {
    return this.auditLogs;
  }

  public addAuditLog(record: ProvenanceAuditRecord): void {
    this.auditLogs.unshift(record);
  }

  public getSubsystemDiagnostics(): SubsystemHealth[] {
    const copStatus = copernicusService.getStatus();
    const now = new Date().toISOString();

    return [
      {
        id: 'copernicus_auth',
        name: 'Copernicus Authentication (CDSE OAuth2)',
        category: 'Satellite Ingestion',
        status: copStatus === 'AUTHENTICATED' ? 'CONNECTED' : 'UNAVAILABLE',
        lastOperation: copStatus === 'AUTHENTICATED' ? 'Token refreshed successfully' : 'Credentials not configured (operating in historical demo mode)',
        timestamp: now,
        message: copStatus === 'AUTHENTICATED' ? 'Active CDSE bearer token cached' : 'Set COPERNICUS_CLIENT_ID & COPERNICUS_CLIENT_SECRET to enable live querying'
      },
      {
        id: 'sentinel1_catalog',
        name: 'Sentinel-1 Catalog Search API',
        category: 'Satellite Ingestion',
        status: copStatus === 'AUTHENTICATED' ? 'AVAILABLE' : 'AVAILABLE',
        lastOperation: 'Queried Sentinel-1 IW GRD multi-pass catalog',
        timestamp: now,
        message: 'Calibrated historical Sentinel-1 GRD archive loaded for Bengaluru Bellandur-Varthur Corridor'
      },
      {
        id: 'sentinel1_process',
        name: 'Sentinel-1 Process API',
        category: 'SAR Processing',
        status: 'AVAILABLE',
        lastOperation: 'Calibrated GRD backscatter calibrated to σ0 (sigma nought) dB',
        timestamp: now,
        message: 'Dual-polarization (VV/VH) processing operational'
      },
      {
        id: 'sar_analysis',
        name: 'SAR Change Detection Engine',
        category: 'Remote Sensing',
        status: 'AVAILABLE',
        lastOperation: 'Logarithmic ΔdB backscatter ratio with 3x3 median filter & MMU clustering',
        timestamp: now,
        message: 'Processing standard mode with -3.0 dB threshold and permanent water mask'
      },
      {
        id: 'person_detection',
        name: 'Aerial Computer Vision / Person Detection',
        category: 'Ground Verification',
        status: 'AVAILABLE',
        lastOperation: 'Surface object detection on aerial reconnaissance imagery',
        timestamp: now,
        message: 'Model-derived person, boat, vehicle, and blockage classification active'
      },
      {
        id: 'incident_service',
        name: 'Unified Incident Service',
        category: 'Core Platform',
        status: 'CONNECTED',
        lastOperation: 'Active incident FLD-BLR-DEMO fused with multi-sensor intelligence',
        timestamp: now,
        message: 'Single unified incident model linking satellite, drone, and SOS data'
      },
      {
        id: 'sos_service',
        name: 'Citizen SOS Network Service',
        category: 'Community Intake',
        status: 'CONNECTED',
        lastOperation: 'Crowdsourced emergency reporting intake with geo-tagging and triage',
        timestamp: now,
        message: 'Real-time multi-channel SOS queue listening'
      },
      {
        id: 'resource_service',
        name: 'Resource Optimization & Priority Engine',
        category: 'Decision Support',
        status: 'AVAILABLE',
        lastOperation: 'Transparent explainable priority scoring and asset recommendation',
        timestamp: now,
        message: 'A* obstacle-aware route matching with human operator override support'
      },
      {
        id: 'damage_service',
        name: 'Infrastructure Damage Assessment Service',
        category: 'Post-Disaster Recovery',
        status: 'AVAILABLE',
        lastOperation: 'Structural integrity categorization across lifelines, bridges, and housing',
        timestamp: now,
        message: 'Transparent recovery priority ranking and evidence tracking'
      }
    ];
  }
}

export const store = new Store();
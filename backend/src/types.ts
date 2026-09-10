export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RoadStatus = 'OPEN' | 'PARTIALLY_BLOCKED' | 'BLOCKED';
export type DamageLevel = 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE' | 'DESTROYED' | 'LOW' | 'CRITICAL';

export type SOSUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SOSStatus = 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED';
export type SOSSource = 'CITIZEN' | 'OPERATOR' | 'SIMULATED_DEMO';

export type ResourceType = 
  | 'AMBULANCE' 
  | 'RESCUE_TEAM' 
  | 'BOAT' 
  | 'MEDICAL_SUPPLIES' 
  | 'FOOD' 
  | 'WATER' 
  | 'SHELTER_CAPACITY' 
  | 'EMERGENCY_VEHICLE'
  | 'boat'
  | 'ambulance'
  | 'rescue_team'
  | 'food_supply'
  | 'medical_kit'
  | 'shelter_crew'
  | 'water_tanker';

export type ResourceAvailability = 'AVAILABLE' | 'RESERVED' | 'ASSIGNED' | 'UNAVAILABLE';

export type InfrastructureType = 
  | 'ROADS' 
  | 'BUILDINGS' 
  | 'BRIDGES' 
  | 'UTILITIES' 
  | 'AGRICULTURE' 
  | 'PUBLIC FACILITIES'
  | 'residential' 
  | 'commercial' 
  | 'hospital' 
  | 'bridge' 
  | 'road' 
  | 'school' 
  | 'agricultural' 
  | 'power_station';

export type DamageEvidenceSource = 
  | 'SATELLITE-DERIVED' 
  | 'AERIAL IMAGERY' 
  | 'OPERATOR VERIFIED' 
  | 'SIMULATED DEMONSTRATION';

export interface IncidentFloodSummary {
  flooded_area_km2?: number;
  inundated_area_km2?: number;
  flood_percentage: number;
  mean_delta_db: number;
  status: string;
  source: string;
}

export interface IncidentGroundSummary {
  total_detections: number;
  people_detected: number;
  source: string;
  confidence_avg: number;
  boats_detected?: number;
}

export interface IncidentSOSSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IncidentResourceSummary {
  assigned_count: number;
  recommended_count: number;
  recommended_types: string[];
}

export interface IncidentDamageSummary {
  total_assessed: number;
  critical_damage: number;
  severe_damage: number;
  summary: string;
}

export interface IncidentPriorities {
  score: number; // 0-100 normalized
  category: RiskLevel;
  reasons: string[];
}

export interface GeoPoint {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PriorityBreakdown {
  score: number;
  category: RiskLevel;
  reasons: string[];
  weightsUsed: {
    floodSeverity: number;
    peopleAffected: number;
    sosUrgency: number;
    medicalUrgency: number;
    accessibilityRisk: number;
  };
  componentScores: {
    flood: number;
    people: number;
    sos: number;
    medical: number;
    access: number;
  };
}

export interface Incident {
  incident_id: string;
  name: string;
  event?: string;
  hazard?: string;
  status?: 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'TRIAGED';
  created_at: string;
  updated_at?: string;
  location: GeoPoint;
  severity?: RiskLevel;
  source?: string;
  description?: string;
  flood_analysis?: IncidentFloodSummary;
  ground_detections?: IncidentGroundSummary;
  sar_analysis?: any;
  sos_reports: number;
  sos_reports_summary?: IncidentSOSSummary;
  resources?: IncidentResourceSummary;
  damage_assessment?: IncidentDamageSummary;
  priorities?: IncidentPriorities;

  // Compatibility fields
  flood_severity: number; // 0 to 1
  risk_level: RiskLevel;
  people_detected: number;
  people_affected: number;
  road_status: RoadStatus;
  damage_level: DamageLevel;
  priority: RiskLevel;
  priority_breakdown?: PriorityBreakdown;
  nearest_shelter_id?: string;
  distance_to_shelter_km?: number;
  assigned_resource_ids: string[];
  is_demo: boolean;
  notes?: string;
}

export interface SOSReport {
  sos_id: string;
  id: string; // alias
  incident_id: string;
  timestamp: string;
  location: GeoPoint;
  people_count: number;
  people_affected: number; // alias
  urgency: SOSUrgency;
  severity: RiskLevel; // alias
  description: string;
  source: SOSSource;
  status: SOSStatus;

  category: 'trapped_person' | 'flooding' | 'blocked_road' | 'damaged_building' | 'medical_emergency' | 'missing_person' | 'general_sos';
  address?: string;
  medical_urgency?: boolean;
  contact_number?: string;
  image_url?: string;
  is_demo: boolean;
}

export interface DamageReport {
  id: string;
  assessment_id?: string;
  incident_id: string;
  location: GeoPoint;
  infrastructure_type?: InfrastructureType;
  structure_type?: string; // alias
  damage_level: DamageLevel;
  evidence_source?: DamageEvidenceSource;
  confidence?: number;
  description: string;
  timestamp: string;
  economic_impact_estimate?: string;
  reconstruction_priority?: number; // 1 to 5
  is_demo: boolean;
}

export interface DroneDetection {
  id: string;
  image_id: string;
  object_type: 'person' | 'vehicle' | 'boat' | 'building' | 'flooded_structure' | 'blocked_road';
  confidence: number; // 0 to 1
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in normalized 0-1
  location?: GeoPoint;
  approved: boolean;
  flagged_for_rescue: boolean;
  notes?: string;
}

export interface ResourceItem {
  id: string;
  resource_id?: string;
  name: string;
  type: ResourceType;
  quantity?: number;
  availability?: ResourceAvailability;
  location: GeoPoint;
  capabilities?: string[];
  assigned_incident?: string | null;
  assigned_incident_id?: string; // alias
  status: ResourceAvailability | 'AVAILABLE' | 'EN_ROUTE' | 'ON_MISSION' | 'MAINTENANCE';

  // Extended operational fields
  base_station?: string;
  capacity?: number;
  speed_kmh?: number;
  all_terrain?: boolean;
  fuel_or_battery_pct?: number;
  is_demo: boolean;
}

export interface ShelterItem {
  id: string;
  name: string;
  location: GeoPoint;
  capacity: number;
  current_occupancy: number;
  supplies_status: 'ABUNDANT' | 'MODERATE' | 'CRITICAL';
  has_medical_facility: boolean;
  contact_phone: string;
  is_open: boolean;
}

export interface RoadEdge {
  id: string;
  name: string;
  coordinates: [number, number][]; // [lat, lng] array
  status: RoadStatus;
  water_depth_cm: number;
  length_km: number;
}

export interface SatelliteObservation {
  scene_id: string;
  mission: string;
  sensor: string;
  mode: string;
  polarization: string;
  orbit_direction: 'ASCENDING' | 'DESCENDING';
  acquisition_timestamp: string;
  aoi_name: string;
  bounds: BoundingBox;
  cloud_cover_percent: number;
  is_demo: boolean;
  thumbnail_url?: string;
  notes: string;
}

export interface SARAnalysisResult {
  aoi_name: string;
  bounds: BoundingBox;
  pre_event_time: string;
  post_event_time: string;
  aoi_area_km2: number;
  flooded_area_km2: number;
  flood_percentage: number;
  inundated_pixels: number;
  permanent_water_km2: number;
  change_threshold_db: number;
  mean_delta_db: number;
  mmu_pixels: number;
  mode: 'SENSITIVE' | 'STANDARD' | 'STRICT' | 'CUSTOM';
  histogram: { delta_db: number; pixel_count: number }[];
  severity_distribution: {
    low: number;
    medium: number;
    high: number;
  };
  flood_geojson: any;
  is_demo: boolean;
  timestamp: string;
}

export interface PresetLocation {
  id: string;
  name: string;
  country: string;
  center: [number, number];
  zoom: number;
  bounds: BoundingBox;
  description: string;
  is_demo: boolean;
}

export interface SystemStatus {
  copernicus_api: 'AUTHENTICATED' | 'NOT CONFIGURED' | 'ERROR';
  sentinel_1: 'AVAILABLE' | 'NO DATA' | 'DEMO ACTIVE';
  gis: 'ONLINE';
  ai: 'ONLINE' | 'ERROR' | 'FALLBACK HEURISTIC';
  database: 'ONLINE (STRUCTURED ENGINE)';
  drone_analysis: 'AVAILABLE' | 'DEMO';
  citizen_network: 'ONLINE';
  current_mode: 'LIVE DATA' | 'DEMO MODE';
  timestamp: string;
}

export interface SubsystemHealth {
  id: string;
  name: string;
  category: string;
  status: 'CONNECTED' | 'AVAILABLE' | 'ERROR' | 'UNAVAILABLE';
  lastOperation: string;
  timestamp: string;
  message?: string;
}

export interface ProvenanceAuditRecord {
  incident_id: string;
  data_source: string;
  operation: string;
  timestamp: string;
  result: string;
  status: 'COMPLETED' | 'MODEL/REAL DATA' | 'SIMULATED DEMONSTRATION' | 'UNAVAILABLE';
}
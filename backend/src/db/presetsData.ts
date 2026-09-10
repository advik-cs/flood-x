import { Incident, PresetLocation, ResourceItem, RoadEdge, ShelterItem, SOSReport, DamageReport, SatelliteObservation } from '../types.js';

export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: 'bengaluru',
    name: 'Bengaluru (Bellandur–Varthur & Outer Ring Road)',
    country: 'India',
    center: [12.9352, 77.6835],
    zoom: 12,
    bounds: { north: 12.9750, south: 12.9000, west: 77.6400, east: 77.7550 },
    description: 'Urban flash flood and lake overflow scenario across Bellandur Lake basin, Varthur corridor, and Outer Ring Road (EcoSpace) technology corridor.',
    is_demo: true
  },
  {
    id: 'india-national',
    name: 'India — National View',
    country: 'India',
    center: [21.7679, 78.8718],
    zoom: 5,
    bounds: { north: 35.70, south: 6.70, west: 68.10, east: 97.40 },
    description: 'National overview showing monsoon surveillance and disaster response coordination across all states and river basins.',
    is_demo: false
  },
  {
    id: 'emilia-romagna',
    name: 'Emilia-Romagna Floods — Historical Demo',
    country: 'Italy',
    center: [44.35, 11.95],
    zoom: 11,
    bounds: { north: 44.60, south: 44.10, west: 11.60, east: 12.40 },
    description: 'Historical May 2023 flood reference scenario in Faenza, Forlì & Ravenna basin.',
    is_demo: true
  },
  {
    id: 'mumbai',
    name: 'Mumbai (Mithi River & Kurla)',
    country: 'India',
    center: [19.0650, 72.8800],
    zoom: 12,
    bounds: { north: 19.30, south: 18.88, west: 72.75, east: 73.05 },
    description: 'High-tide confluence and river overflow along Mithi River, Kurla West, and Dadar lowlands.',
    is_demo: true
  },
  {
    id: 'chennai',
    name: 'Chennai (Adyar & Velachery)',
    country: 'India',
    center: [12.9800, 80.2200],
    zoom: 12,
    bounds: { north: 13.25, south: 12.85, west: 80.05, east: 80.35 },
    description: 'Coastal and river overflow across Adyar, Velachery marshland, and Mudichur residential belt.',
    is_demo: true
  },
  {
    id: 'kerala',
    name: 'Kerala (Periyar Basin & Aluva)',
    country: 'India',
    center: [10.1076, 76.3516],
    zoom: 11,
    bounds: { north: 10.30, south: 9.30, west: 76.15, east: 76.95 },
    description: 'Dam shutter release and extreme catchment downpour flooding Aluva town and Periyar delta.',
    is_demo: true
  },
  {
    id: 'guwahati',
    name: 'Guwahati (Brahmaputra Floodplain)',
    country: 'India',
    center: [26.1600, 91.7500],
    zoom: 12,
    bounds: { north: 26.25, south: 26.10, west: 91.60, east: 91.90 },
    description: 'Brahmaputra seasonal spate backflowing into Bharalu drainage channel and urban lowlands.',
    is_demo: true
  }
];

export const INITIAL_OBSERVATIONS: Record<string, SatelliteObservation> = {
  'emilia-romagna': {
    scene_id: 'S1A_IW_GRDH_1SDV_20230518T051219_20230518T051244_048590_05D84A_86C1',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW (Interferometric Wide)',
    polarization: 'VV / VH',
    orbit_direction: 'DESCENDING',
    acquisition_timestamp: '2023-05-18T05:12:19Z',
    aoi_name: 'Emilia-Romagna Floods — Demo',
    bounds: { north: 44.60, south: 44.10, west: 11.60, east: 12.40 },
    cloud_cover_percent: 0.0, // SAR is all-weather / cloud-independent
    is_demo: true,
    notes: 'Sentinel-1 provides periodic orbital observations rather than continuous live video. This system uses the latest available acquisition for the selected area.'
  },
  'bengaluru': {
    scene_id: 'S1A_IW_GRDH_1SDV_20240905T124010_055410_06C123_4A1B',
    mission: 'Sentinel-1A (Copernicus CDSE Reference)',
    sensor: 'C-SAR (5.405 GHz)',
    mode: 'IW',
    polarization: 'VV / VH',
    orbit_direction: 'ASCENDING',
    acquisition_timestamp: '2024-09-05T12:40:10Z',
    aoi_name: 'Bellandur–Varthur Drainage Basin, Bengaluru',
    bounds: { north: 12.9750, south: 12.9000, west: 77.6400, east: 77.7550 },
    cloud_cover_percent: 0.0,
    is_demo: true,
    notes: 'Calibrated demonstration SAR observation mapped to Bellandur–Varthur monsoon catchment.'
  },
  'mumbai': {
    scene_id: 'S1B_IW_GRDH_1SDV_20240822T005512_054890_06A890_3F2E',
    mission: 'Sentinel-1B',
    sensor: 'C-SAR',
    mode: 'IW',
    polarization: 'VV / VH',
    orbit_direction: 'DESCENDING',
    acquisition_timestamp: '2024-08-22T00:55:12Z',
    aoi_name: 'Mumbai',
    bounds: { north: 19.30, south: 18.88, west: 72.75, east: 73.05 },
    cloud_cover_percent: 0.0,
    is_demo: true,
    notes: 'High-resolution SAR backscatter capture over Mumbai coastal strip.'
  },
  'chennai': {
    scene_id: 'S1A_IW_GRDH_1SDV_20231206T004018_051510_063810_1D9A',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW',
    polarization: 'VV / VH',
    orbit_direction: 'DESCENDING',
    acquisition_timestamp: '2023-12-06T00:40:18Z',
    aoi_name: 'Chennai',
    bounds: { north: 13.25, south: 12.85, west: 80.05, east: 80.35 },
    cloud_cover_percent: 0.0,
    is_demo: true,
    notes: 'Cyclone Michaung post-event SAR observation of Adyar basin.'
  },
  'kerala': {
    scene_id: 'S1A_IW_GRDH_1SDV_20240810T121045_055100_06B400_9E7C',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW',
    polarization: 'VV / VH',
    orbit_direction: 'ASCENDING',
    acquisition_timestamp: '2024-08-10T12:10:45Z',
    aoi_name: 'Kerala',
    bounds: { north: 10.30, south: 9.30, west: 76.15, east: 76.95 },
    cloud_cover_percent: 0.0,
    is_demo: true,
    notes: 'Monsoon SAR observation across Aluva / Periyar floodplain.'
  },
  'guwahati': {
    scene_id: 'S1A_IW_GRDH_1SDV_20240715T114522_054700_06A100_5C8B',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW',
    polarization: 'VV / VH',
    orbit_direction: 'DESCENDING',
    acquisition_timestamp: '2024-07-15T11:45:22Z',
    aoi_name: 'Guwahati',
    bounds: { north: 26.25, south: 26.10, west: 91.60, east: 91.90 },
    cloud_cover_percent: 0.0,
    is_demo: true,
    notes: 'Brahmaputra high-flow SAR surveillance.'
  },
  'india-national': {
    scene_id: 'S1A_IW_COMPOSITE_NATIONAL_20240901_20240908',
    mission: 'Sentinel-1 Constellation',
    sensor: 'C-SAR',
    mode: 'IW Mosaic',
    polarization: 'VV',
    orbit_direction: 'ASCENDING',
    acquisition_timestamp: '2024-09-08T00:00:00Z',
    aoi_name: 'India — National View',
    bounds: { north: 35.70, south: 6.70, west: 68.10, east: 97.40 },
    cloud_cover_percent: 0.0,
    is_demo: true,
    notes: 'Multi-pass national composite mosaic of major flood basins.'
  }
};

export const INITIAL_INCIDENTS: Record<string, Incident[]> = {
  'emilia-romagna': [
    {
      incident_id: 'FLD-EMR-2023',
      name: 'Faenza Central - Lamone River Overbank Inundation',
      event: 'Emilia-Romagna Flood — May 2023',
      hazard: 'Flood',
      status: 'ACTIVE',
      severity: 'CRITICAL',
      source: 'COPERNICUS SENTINEL-1 + AERIAL RECONNAISSANCE',
      description: 'Severe overbank inundation along Lamone River following levee collapse at Via Renaccio. 45 residents in critical danger with 7 confirmed rooftop strandings.',
      location: { lat: 44.2885, lng: 11.8795 },
      flood_severity: 0.87,
      risk_level: 'CRITICAL',
      sos_reports: 14,
      people_detected: 7,
      people_affected: 45,
      road_status: 'BLOCKED',
      damage_level: 'SEVERE',
      priority: 'CRITICAL',
      flood_analysis: {
        inundated_area_km2: 48.6,
        flood_percentage: 16.4,
        mean_delta_db: -5.8,
        status: 'SAR-derived inundation available',
        source: 'COPERNICUS SENTINEL-1'
      },
      ground_detections: {
        total_detections: 7,
        people_detected: 7,
        source: 'MODEL-DERIVED',
        confidence_avg: 0.91
      },
      sos_reports_summary: {
        total: 14,
        critical: 6,
        high: 5,
        medium: 3,
        low: 0
      },
      resources: {
        assigned_count: 0,
        recommended_count: 3,
        recommended_types: ['BOAT', 'RESCUE_TEAM', 'AMBULANCE']
      },
      damage_assessment: {
        total_assessed: 3,
        critical_damage: 1,
        severe_damage: 2,
        summary: 'Ponte delle Grazie bridge approach undermined; 18 residential units severely submerged'
      },
      priorities: {
        score: 94,
        category: 'CRITICAL',
        reasons: [
          'Direct levee breach on Lamone River causing violent fast-moving water',
          '7 individuals confirmed stranded on rooftops requiring immediate boat extraction',
          'Access route on Via Renaccio completely blocked by floodwaters',
          'Critical medical SOS logged for insulin/dialysis patient in sector'
        ]
      },
      nearest_shelter_id: 'SHL-ER-01',
      distance_to_shelter_km: 3.2,
      assigned_resource_ids: [],
      created_at: '2023-05-18T06:30:00Z',
      updated_at: '2023-05-18T07:15:00Z',
      is_demo: true,
      notes: 'Major levee breach along Via Renaccio. Drone video confirmed 7 people stranded on rooftops with rising water.'
    },
    {
      incident_id: 'FLD-002',
      name: 'Forlì Ronco District Urban Inundation',
      event: 'Emilia-Romagna Flood — May 2023',
      hazard: 'Flood',
      status: 'ACTIVE',
      severity: 'HIGH',
      source: 'COPERNICUS SENTINEL-1',
      description: 'Montone river spillover in Forlì Ronco district. Secondary access road passable only by high-clearance 4x4.',
      location: { lat: 44.2150, lng: 12.0620 },
      flood_severity: 0.72,
      risk_level: 'HIGH',
      sos_reports: 9,
      people_detected: 3,
      people_affected: 28,
      road_status: 'PARTIALLY_BLOCKED',
      damage_level: 'MODERATE',
      priority: 'HIGH',
      flood_analysis: {
        inundated_area_km2: 24.2,
        flood_percentage: 9.8,
        mean_delta_db: -4.2,
        status: 'SAR-derived inundation available',
        source: 'COPERNICUS SENTINEL-1'
      },
      ground_detections: {
        total_detections: 3,
        people_detected: 3,
        source: 'MODEL-DERIVED',
        confidence_avg: 0.88
      },
      sos_reports_summary: {
        total: 9,
        critical: 2,
        high: 4,
        medium: 3,
        low: 0
      },
      resources: {
        assigned_count: 1,
        recommended_count: 2,
        recommended_types: ['RESCUE_TEAM', 'AMBULANCE']
      },
      damage_assessment: {
        total_assessed: 1,
        critical_damage: 0,
        severe_damage: 1,
        summary: 'Commercial warehouse and roadway sub-base scour'
      },
      priorities: {
        score: 74,
        category: 'HIGH',
        reasons: [
          'Montone river cresting with sustained spillover',
          '3 stranded residents detected near Ronco park',
          'Access route partially impassable'
        ]
      },
      nearest_shelter_id: 'SHL-ER-02',
      distance_to_shelter_km: 1.8,
      assigned_resource_ids: ['RES-ER-03'],
      created_at: '2023-05-18T06:45:00Z',
      updated_at: '2023-05-18T07:20:00Z',
      is_demo: true,
      notes: 'Montone river spillover. Secondary access road passable only by high-clearance 4x4.'
    },
    {
      incident_id: 'FLD-003',
      name: 'Ravenna South Agricultural Lowland Submersion',
      event: 'Emilia-Romagna Flood — May 2023',
      hazard: 'Flood',
      status: 'MONITORING',
      severity: 'MEDIUM',
      source: 'COPERNICUS SENTINEL-1',
      description: 'Canal overflow inundating farm orchards and agricultural storage facilities in Ravenna South.',
      location: { lat: 44.3850, lng: 12.2100 },
      flood_severity: 0.54,
      risk_level: 'MEDIUM',
      sos_reports: 3,
      people_detected: 0,
      people_affected: 12,
      road_status: 'OPEN',
      damage_level: 'MODERATE',
      priority: 'MEDIUM',
      flood_analysis: {
        inundated_area_km2: 18.5,
        flood_percentage: 6.2,
        mean_delta_db: -3.4,
        status: 'SAR-derived inundation available',
        source: 'COPERNICUS SENTINEL-1'
      },
      ground_detections: {
        total_detections: 0,
        people_detected: 0,
        source: 'MODEL-DERIVED',
        confidence_avg: 0
      },
      sos_reports_summary: {
        total: 3,
        critical: 0,
        high: 1,
        medium: 2,
        low: 0
      },
      resources: {
        assigned_count: 0,
        recommended_count: 1,
        recommended_types: ['EMERGENCY_VEHICLE']
      },
      damage_assessment: {
        total_assessed: 1,
        critical_damage: 0,
        severe_damage: 0,
        summary: 'Drainage culvert overflow in orchard basin'
      },
      priorities: {
        score: 48,
        category: 'MEDIUM',
        reasons: [
          'Canal overflow impacting agricultural plots',
          'Roads remain passable for evacuation'
        ]
      },
      nearest_shelter_id: 'SHL-ER-03',
      distance_to_shelter_km: 4.5,
      assigned_resource_ids: [],
      created_at: '2023-05-18T07:00:00Z',
      updated_at: '2023-05-18T07:10:00Z',
      is_demo: true,
      notes: 'Canal overflow inundating farm orchards and agricultural storage facilities.'
    }
  ],
  'bengaluru': [
    {
      incident_id: 'FLD-BLR-DEMO',
      name: 'Bellandur Flood Corridor & EcoSpace',
      event: 'Bengaluru Urban Flood — Demo Scenario',
      hazard: 'Urban Flash Flood & Lake Overflow',
      status: 'ACTIVE',
      severity: 'CRITICAL',
      source: 'BENGALURU FLOOD MONITORING & AERIAL RECON',
      description: 'Severe overbank inundation along Bellandur Lake outflow and Rajakaluve drain. Outer Ring Road (EcoSpace) submerged under 4.5 ft water with confirmed stranded commuters and residents.',
      location: { lat: 12.9352, lng: 77.6835 },
      flood_severity: 0.88,
      risk_level: 'CRITICAL',
      sos_reports: 16,
      people_detected: 3,
      people_affected: 45,
      road_status: 'BLOCKED',
      damage_level: 'SEVERE',
      priority: 'CRITICAL',
      flood_analysis: {
        inundated_area_km2: 12.4,
        flood_percentage: 12.0,
        mean_delta_db: -4.8,
        status: 'Simulated Inundation Delineation',
        source: 'SIMULATED FLOOD EXTENT — BENGALURU DEMO'
      },
      ground_detections: {
        total_detections: 7,
        people_detected: 3,
        source: 'MODEL-DERIVED AERIAL RECON',
        confidence_avg: 0.92
      },
      sos_reports_summary: {
        total: 16,
        critical: 7,
        high: 5,
        medium: 4,
        low: 0
      },
      resources: {
        assigned_count: 0,
        recommended_count: 3,
        recommended_types: ['BOAT', 'RESCUE_TEAM', 'AMBULANCE']
      },
      damage_assessment: {
        total_assessed: 4,
        critical_damage: 1,
        severe_damage: 2,
        summary: 'EcoSpace ORR underpass submerged; Kariyammana Agrahara residential baseline scoured'
      },
      priorities: {
        score: 92,
        category: 'CRITICAL',
        reasons: [
          'Bellandur Lake weir overflow inundating Outer Ring Road tech corridor',
          '3 stranded individuals visually confirmed on elevated platforms/rooftops',
          'Primary ingress/egress road (Outer Ring Road) completely blocked',
          'Active high-urgency medical distress calls from trapped residents'
        ]
      },
      nearest_shelter_id: 'SHL-BLR-01',
      distance_to_shelter_km: 2.3,
      assigned_resource_ids: [],
      created_at: '2024-09-05T14:00:00Z',
      updated_at: '2024-09-05T14:30:00Z',
      is_demo: true,
      notes: 'SIMULATED OPERATIONAL REPORT — Outer Ring Road tech corridor inundated. High-draft rescue boats and SDRF required for evacuation.'
    },
    {
      incident_id: 'FLD-BLR-002',
      name: 'Varthur Low-Lying Zone & Lake Wetland',
      event: 'Bengaluru Urban Flood — Demo Scenario',
      hazard: 'Lake Overflow',
      status: 'ACTIVE',
      severity: 'HIGH',
      source: 'BENGALURU FLOOD MONITORING & SENSORS',
      description: 'Varthur wetland buffer overtopped into low-lying settlements and agricultural corridors.',
      location: { lat: 12.9460, lng: 77.7380 },
      flood_severity: 0.74,
      risk_level: 'HIGH',
      sos_reports: 9,
      people_detected: 0,
      people_affected: 28,
      road_status: 'PARTIALLY_BLOCKED',
      damage_level: 'MODERATE',
      priority: 'HIGH',
      flood_analysis: {
        inundated_area_km2: 4.8,
        flood_percentage: 4.6,
        mean_delta_db: -3.6,
        status: 'Simulated Inundation Delineation',
        source: 'SIMULATED FLOOD EXTENT — BENGALURU DEMO'
      },
      ground_detections: {
        total_detections: 0,
        people_detected: 0,
        source: 'MODEL-DERIVED',
        confidence_avg: 0
      },
      sos_reports_summary: {
        total: 9,
        critical: 2,
        high: 4,
        medium: 3,
        low: 0
      },
      resources: {
        assigned_count: 1,
        recommended_count: 2,
        recommended_types: ['BOAT', 'RESCUE_TEAM']
      },
      damage_assessment: {
        total_assessed: 1,
        critical_damage: 0,
        severe_damage: 1,
        summary: 'Agricultural perimeter bund overtopped'
      },
      priorities: {
        score: 72,
        category: 'HIGH',
        reasons: [
          'Varthur Lake wetland overspill into low-lying agricultural belt',
          'Secondary feeder roads impassable for two-wheelers'
        ]
      },
      nearest_shelter_id: 'SHL-BLR-03',
      distance_to_shelter_km: 1.8,
      assigned_resource_ids: ['RES-BLR-01'],
      created_at: '2024-09-05T14:15:00Z',
      updated_at: '2024-09-05T14:40:00Z',
      is_demo: true,
      notes: 'SIMULATED OPERATIONAL REPORT — Varthur wetland buffer overtopped into low-lying settlements.'
    },
    {
      incident_id: 'FLD-BLR-003',
      name: 'Outer Ring Road Flooded Section (Marathahalli–Devarabisanahalli)',
      event: 'Bengaluru Urban Flood — Demo Scenario',
      hazard: 'Stormwater Inundation',
      status: 'MONITORING',
      severity: 'MEDIUM',
      source: 'MUNICIPAL SENSOR NETWORK',
      description: 'Stormwater canal overflow along service lanes affecting transit flow near Marathahalli junction.',
      location: { lat: 12.9410, lng: 77.6980 },
      flood_severity: 0.58,
      risk_level: 'MEDIUM',
      sos_reports: 4,
      people_detected: 0,
      people_affected: 15,
      road_status: 'PARTIALLY_BLOCKED',
      damage_level: 'MODERATE',
      priority: 'MEDIUM',
      flood_analysis: {
        inundated_area_km2: 2.1,
        flood_percentage: 2.0,
        mean_delta_db: -2.9,
        status: 'Simulated Inundation Delineation',
        source: 'SIMULATED FLOOD EXTENT — BENGALURU DEMO'
      },
      ground_detections: {
        total_detections: 0,
        people_detected: 0,
        source: 'MODEL-DERIVED',
        confidence_avg: 0
      },
      sos_reports_summary: {
        total: 4,
        critical: 0,
        high: 2,
        medium: 2,
        low: 0
      },
      resources: {
        assigned_count: 0,
        recommended_count: 1,
        recommended_types: ['EMERGENCY_VEHICLE']
      },
      damage_assessment: {
        total_assessed: 1,
        critical_damage: 0,
        severe_damage: 0,
        summary: 'Service road asphalt scouring'
      },
      priorities: {
        score: 48,
        category: 'MEDIUM',
        reasons: [
          'Stormwater drain overflow onto secondary service lanes',
          'Main flyover remains open for transit'
        ]
      },
      nearest_shelter_id: 'SHL-BLR-01',
      distance_to_shelter_km: 3.1,
      assigned_resource_ids: [],
      created_at: '2024-09-05T14:30:00Z',
      updated_at: '2024-09-05T14:45:00Z',
      is_demo: true,
      notes: 'SIMULATED OPERATIONAL REPORT — Stormwater canal overflow along service lanes.'
    }
  ],
  'mumbai': [
    {
      incident_id: 'BOM-001',
      name: 'Mithi River Kurla West Overflow & LBS Marg',
      location: { lat: 19.0680, lng: 72.8750 },
      flood_severity: 0.89,
      risk_level: 'CRITICAL',
      sos_reports: 22,
      people_detected: 15,
      people_affected: 85,
      road_status: 'BLOCKED',
      damage_level: 'CRITICAL',
      priority: 'CRITICAL',
      nearest_shelter_id: 'SHL-BOM-01',
      distance_to_shelter_km: 1.2,
      assigned_resource_ids: [],
      created_at: '2024-08-22T02:00:00Z',
      updated_at: '2024-08-22T02:45:00Z',
      is_demo: true,
      notes: 'High tide 4.6m coinciding with 180mm downpour. Slum tenements flooded up to second floor.'
    }
  ],
  'chennai': [
    {
      incident_id: 'CHN-001',
      name: 'Velachery Lake Overflow & Ram Nagar Inundation',
      location: { lat: 12.9750, lng: 80.2190 },
      flood_severity: 0.85,
      risk_level: 'CRITICAL',
      sos_reports: 16,
      people_detected: 9,
      people_affected: 52,
      road_status: 'BLOCKED',
      damage_level: 'SEVERE',
      priority: 'CRITICAL',
      nearest_shelter_id: 'SHL-CHN-01',
      distance_to_shelter_km: 1.9,
      assigned_resource_ids: [],
      created_at: '2023-12-06T02:15:00Z',
      updated_at: '2023-12-06T03:00:00Z',
      is_demo: true,
      notes: 'Cyclone runoff stagnation. Over 5 feet standing water in ground-floor houses.'
    }
  ],
  'kerala': [
    {
      incident_id: 'KER-001',
      name: 'Aluva Manappuram Periyar Spate',
      location: { lat: 10.1120, lng: 76.3550 },
      flood_severity: 0.88,
      risk_level: 'CRITICAL',
      sos_reports: 19,
      people_detected: 8,
      people_affected: 64,
      road_status: 'BLOCKED',
      damage_level: 'SEVERE',
      priority: 'CRITICAL',
      nearest_shelter_id: 'SHL-KER-01',
      distance_to_shelter_km: 2.4,
      assigned_resource_ids: [],
      created_at: '2024-08-10T13:30:00Z',
      updated_at: '2024-08-10T14:10:00Z',
      is_demo: true,
      notes: 'River flow exceeding danger mark by 1.8m. Temple grounds submerged; bridge approach inundated.'
    }
  ],
  'guwahati': [
    {
      incident_id: 'GAU-001',
      name: 'Anil Nagar - Bharalu Channel Waterlogging',
      location: { lat: 26.1720, lng: 91.7680 },
      flood_severity: 0.79,
      risk_level: 'HIGH',
      sos_reports: 11,
      people_detected: 4,
      people_affected: 30,
      road_status: 'BLOCKED',
      damage_level: 'MODERATE',
      priority: 'HIGH',
      nearest_shelter_id: 'SHL-GAU-01',
      distance_to_shelter_km: 1.6,
      assigned_resource_ids: [],
      created_at: '2024-07-15T12:30:00Z',
      updated_at: '2024-07-15T13:00:00Z',
      is_demo: true,
      notes: 'High water in Brahmaputra prevents gravity outflow from city sluice gates.'
    }
  ],
  'india-national': []
};

export const INITIAL_RESOURCES: Record<string, ResourceItem[]> = {
  'emilia-romagna': [
    {
      id: 'RES-ER-01',
      name: 'Vigili del Fuoco SAR Boat Alpha',
      type: 'boat',
      status: 'AVAILABLE',
      location: { lat: 44.3050, lng: 11.8500 },
      base_station: 'Faenza EOC Staging Area',
      capacity: 8,
      speed_kmh: 22,
      all_terrain: true,
      fuel_or_battery_pct: 94,
      is_demo: true
    },
    {
      id: 'RES-ER-02',
      name: 'Red Cross All-Terrain Ambulance 104',
      type: 'ambulance',
      status: 'AVAILABLE',
      location: { lat: 44.3120, lng: 11.8900 },
      base_station: 'Faenza North Hospital Staging',
      capacity: 3,
      speed_kmh: 45,
      all_terrain: true,
      fuel_or_battery_pct: 88,
      is_demo: true
    },
    {
      id: 'RES-ER-03',
      name: 'Protezione Civile Rapid Response Team 07',
      type: 'rescue_team',
      status: 'ON_MISSION',
      location: { lat: 44.2200, lng: 12.0550 },
      base_station: 'Forlì Central Station',
      capacity: 6,
      speed_kmh: 30,
      all_terrain: true,
      assigned_incident_id: 'FLD-002',
      fuel_or_battery_pct: 75,
      is_demo: true
    },
    {
      id: 'RES-ER-04',
      name: 'Airdrop Food & Drinking Water Supply Rig',
      type: 'food_supply',
      status: 'AVAILABLE',
      location: { lat: 44.3200, lng: 11.8600 },
      base_station: 'Bologna Regional Logistics Hub',
      capacity: 250,
      speed_kmh: 60,
      all_terrain: false,
      fuel_or_battery_pct: 100,
      is_demo: true
    },
    {
      id: 'RES-ER-05',
      name: 'Advanced Mobile Trauma / First-Aid Kit Kit-4',
      type: 'medical_kit',
      status: 'AVAILABLE',
      location: { lat: 44.2980, lng: 11.8650 },
      base_station: 'Faenza Relief Depot',
      capacity: 50,
      speed_kmh: 35,
      all_terrain: true,
      fuel_or_battery_pct: 90,
      is_demo: true
    }
  ],
  'bengaluru': [
    {
      id: 'RES-BLR-01',
      name: 'NDRF 10th Bn Inflatable Rescue Boat Alpha',
      type: 'boat',
      status: 'AVAILABLE',
      location: { lat: 12.9320, lng: 77.6750 },
      base_station: 'Bellandur Fire Staging Depot',
      capacity: 10,
      speed_kmh: 22,
      all_terrain: true,
      fuel_or_battery_pct: 95,
      is_demo: true
    },
    {
      id: 'RES-BLR-02',
      name: 'Karnataka SDRF Swift-Water Rescue Team 3',
      type: 'rescue_team',
      status: 'AVAILABLE',
      location: { lat: 12.9420, lng: 77.6780 },
      base_station: 'HAL Emergency Response Hub',
      capacity: 8,
      speed_kmh: 35,
      all_terrain: true,
      fuel_or_battery_pct: 90,
      is_demo: true
    },
    {
      id: 'RES-BLR-03',
      name: 'Manipal Hospital Emergency 4x4 Trauma Ambulance',
      type: 'ambulance',
      status: 'AVAILABLE',
      location: { lat: 12.9550, lng: 77.6650 },
      base_station: 'Old Airport Road Trauma Wing',
      capacity: 3,
      speed_kmh: 50,
      all_terrain: true,
      fuel_or_battery_pct: 88,
      is_demo: true
    },
    {
      id: 'RES-BLR-04',
      name: 'BBMP Heavy Food & Potable Water Supply Carrier',
      type: 'food_supply',
      status: 'AVAILABLE',
      location: { lat: 12.9600, lng: 77.7100 },
      base_station: 'Marathahalli Central Logistics Staging',
      capacity: 300,
      speed_kmh: 40,
      all_terrain: false,
      fuel_or_battery_pct: 98,
      is_demo: true
    },
    {
      id: 'RES-BLR-05',
      name: 'Whitefield Emergency Medical Stabilization Unit',
      type: 'medical_kit',
      status: 'AVAILABLE',
      location: { lat: 12.9680, lng: 77.7450 },
      base_station: 'Whitefield Community Health Centre',
      capacity: 60,
      speed_kmh: 45,
      all_terrain: true,
      fuel_or_battery_pct: 92,
      is_demo: true
    }
  ],
  'mumbai': [
    {
      id: 'RES-BOM-01',
      name: 'NDRF Mumbai Flood Rescue Unit 01',
      type: 'boat',
      status: 'AVAILABLE',
      location: { lat: 19.0750, lng: 72.8650 },
      base_station: 'BKC Fire Command HQ',
      capacity: 12,
      speed_kmh: 20,
      all_terrain: true,
      fuel_or_battery_pct: 95,
      is_demo: true
    },
    {
      id: 'RES-BOM-02',
      name: 'BMC Disaster Management Ambulance Squad',
      type: 'ambulance',
      status: 'AVAILABLE',
      location: { lat: 19.0620, lng: 72.8850 },
      base_station: 'Sion Hospital Trauma Center',
      capacity: 4,
      speed_kmh: 35,
      all_terrain: true,
      fuel_or_battery_pct: 88,
      is_demo: true
    }
  ],
  'chennai': [
    {
      id: 'RES-CHN-01',
      name: 'Coastal Police Rubber Boat Delta 2',
      type: 'boat',
      status: 'AVAILABLE',
      location: { lat: 12.9850, lng: 80.2300 },
      base_station: 'Velachery MRTS Relief Hub',
      capacity: 8,
      speed_kmh: 22,
      all_terrain: true,
      fuel_or_battery_pct: 90,
      is_demo: true
    }
  ],
  'kerala': [
    {
      id: 'RES-KER-01',
      name: 'Kerala Fire & Rescue Swift Water Craft 05',
      type: 'boat',
      status: 'AVAILABLE',
      location: { lat: 10.1180, lng: 76.3450 },
      base_station: 'Aluva Police Station Staging',
      capacity: 10,
      speed_kmh: 25,
      all_terrain: true,
      fuel_or_battery_pct: 92,
      is_demo: true
    }
  ],
  'guwahati': [
    {
      id: 'RES-GAU-01',
      name: 'SDRF Assam River Rescue Unit Alpha',
      type: 'boat',
      status: 'AVAILABLE',
      location: { lat: 26.1750, lng: 91.7550 },
      base_station: 'Guwahati Port Staging Pier',
      capacity: 12,
      speed_kmh: 20,
      all_terrain: true,
      fuel_or_battery_pct: 88,
      is_demo: true
    }
  ],
  'india-national': []
};

export const INITIAL_SHELTERS: Record<string, ShelterItem[]> = {
  'emilia-romagna': [
    {
      id: 'SHL-ER-01',
      name: 'PalaCattani Sports Complex Evacuation Center',
      location: { lat: 44.3015, lng: 11.8710 },
      capacity: 500,
      current_occupancy: 310,
      supplies_status: 'ABUNDANT',
      has_medical_facility: true,
      contact_phone: '+39 0546 6911',
      is_open: true
    },
    {
      id: 'SHL-ER-02',
      name: 'Forlì Fairgrounds Emergency Shelter',
      location: { lat: 44.2310, lng: 12.0490 },
      capacity: 650,
      current_occupancy: 420,
      supplies_status: 'MODERATE',
      has_medical_facility: true,
      contact_phone: '+39 0543 7121',
      is_open: true
    },
    {
      id: 'SHL-ER-03',
      name: 'Ravenna West Primary School Relief Point',
      location: { lat: 44.4120, lng: 12.1850 },
      capacity: 250,
      current_occupancy: 95,
      supplies_status: 'ABUNDANT',
      has_medical_facility: false,
      contact_phone: '+39 0544 4821',
      is_open: true
    }
  ],
  'bengaluru': [
    {
      id: 'SHL-BLR-01',
      name: 'HAL Indoor Community Sports Center',
      location: { lat: 12.9550, lng: 77.6780 },
      capacity: 500,
      current_occupancy: 280,
      supplies_status: 'ABUNDANT',
      has_medical_facility: true,
      contact_phone: '+91 80 2234 5678',
      is_open: true
    },
    {
      id: 'SHL-BLR-02',
      name: 'Bellandur Govt Higher Secondary Relief Wing',
      location: { lat: 12.9250, lng: 77.6710 },
      capacity: 350,
      current_occupancy: 190,
      supplies_status: 'MODERATE',
      has_medical_facility: true,
      contact_phone: '+91 80 2574 1100',
      is_open: true
    },
    {
      id: 'SHL-BLR-03',
      name: 'Whitefield Community Welfare Center',
      location: { lat: 12.9690, lng: 77.7500 },
      capacity: 400,
      current_occupancy: 120,
      supplies_status: 'ABUNDANT',
      has_medical_facility: false,
      contact_phone: '+91 80 2845 2211',
      is_open: true
    }
  ],
  'mumbai': [
    {
      id: 'SHL-BOM-01',
      name: 'Kurla Municipal Secondary School Relief Camp',
      location: { lat: 19.0710, lng: 72.8820 },
      capacity: 600,
      current_occupancy: 490,
      supplies_status: 'MODERATE',
      has_medical_facility: true,
      contact_phone: '+91 22 2650 1234',
      is_open: true
    }
  ],
  'chennai': [
    {
      id: 'SHL-CHN-01',
      name: 'Guru Nanak College Indoor Auditorium',
      location: { lat: 12.9900, lng: 80.2150 },
      capacity: 500,
      current_occupancy: 280,
      supplies_status: 'ABUNDANT',
      has_medical_facility: true,
      contact_phone: '+91 44 2245 1700',
      is_open: true
    }
  ],
  'kerala': [
    {
      id: 'SHL-KER-01',
      name: 'Aluva UC College Relief Center',
      location: { lat: 10.1250, lng: 76.3400 },
      capacity: 700,
      current_occupancy: 510,
      supplies_status: 'ABUNDANT',
      has_medical_facility: true,
      contact_phone: '+91 484 260 5500',
      is_open: true
    }
  ],
  'guwahati': [
    {
      id: 'SHL-GAU-01',
      name: 'Guwahati Indoor Stadium Chandmari',
      location: { lat: 26.1820, lng: 91.7720 },
      capacity: 450,
      current_occupancy: 220,
      supplies_status: 'ABUNDANT',
      has_medical_facility: true,
      contact_phone: '+91 361 245 0000',
      is_open: true
    }
  ],
  'india-national': []
};

export const INITIAL_ROADS: Record<string, RoadEdge[]> = {
  'emilia-romagna': [
    {
      id: 'RD-ER-01',
      name: 'Via Renaccio (Lamone River Embankment Road)',
      coordinates: [[44.2850, 11.8750], [44.2885, 11.8795], [44.2920, 11.8840]],
      status: 'BLOCKED',
      water_depth_cm: 120,
      length_km: 1.4
    },
    {
      id: 'RD-ER-02',
      name: 'Strada Statale 9 Via Emilia (Faenza Bypass)',
      coordinates: [[44.2960, 11.8600], [44.3010, 11.8720], [44.3080, 11.8890]],
      status: 'OPEN',
      water_depth_cm: 0,
      length_km: 3.1
    },
    {
      id: 'RD-ER-03',
      name: 'Via Fornarina Bridge Approach',
      coordinates: [[44.2890, 11.8810], [44.2910, 11.8860]],
      status: 'BLOCKED',
      water_depth_cm: 95,
      length_km: 0.8
    },
    {
      id: 'RD-ER-04',
      name: 'Corso Garibaldi North Artery',
      coordinates: [[44.2930, 11.8750], [44.2980, 11.8720]],
      status: 'PARTIALLY_BLOCKED',
      water_depth_cm: 25,
      length_km: 1.0
    }
  ],
  'bengaluru': [
    {
      id: 'RD-BLR-01',
      name: 'Outer Ring Road (EcoSpace - Bellandur Flyover Dip)',
      coordinates: [[12.9230, 77.6810], [12.9280, 77.6850], [12.9340, 77.6920]],
      status: 'BLOCKED',
      water_depth_cm: 110,
      length_km: 1.8
    },
    {
      id: 'RD-BLR-02',
      name: 'Yamalur Main Road (Bellandur to Old Airport Road)',
      coordinates: [[12.9360, 77.6710], [12.9420, 77.6780], [12.9480, 77.6840]],
      status: 'BLOCKED',
      water_depth_cm: 85,
      length_km: 2.1
    },
    {
      id: 'RD-BLR-03',
      name: 'Marathahalli–Sarjapur Elevated Link Bypass',
      coordinates: [[12.9450, 77.7020], [12.9400, 77.7150], [12.9320, 77.7280]],
      status: 'OPEN',
      water_depth_cm: 0,
      length_km: 3.6
    },
    {
      id: 'RD-BLR-04',
      name: 'Panathur Railway Underpass Access',
      coordinates: [[12.9350, 77.6990], [12.9390, 77.7060], [12.9430, 77.7120]],
      status: 'PARTIALLY_BLOCKED',
      water_depth_cm: 35,
      length_km: 1.4
    }
  ],
  'mumbai': [
    {
      id: 'RD-BOM-01',
      name: 'LBS Marg (Kurla Section)',
      coordinates: [[19.0620, 72.8710], [19.0680, 72.8750], [19.0740, 72.8790]],
      status: 'BLOCKED',
      water_depth_cm: 130,
      length_km: 1.8
    }
  ],
  'chennai': [
    {
      id: 'RD-CHN-01',
      name: 'Velachery Main Road (Near Bypass)',
      coordinates: [[12.9700, 80.2150], [12.9750, 80.2190], [12.9810, 80.2240]],
      status: 'BLOCKED',
      water_depth_cm: 85,
      length_km: 1.6
    }
  ],
  'kerala': [
    {
      id: 'RD-KER-01',
      name: 'Aluva - Paravur Road (Bridge Approach)',
      coordinates: [[10.1080, 76.3500], [10.1120, 76.3550], [10.1160, 76.3600]],
      status: 'BLOCKED',
      water_depth_cm: 140,
      length_km: 1.2
    }
  ],
  'guwahati': [
    {
      id: 'RD-GAU-01',
      name: 'GS Road (Anil Nagar Junction)',
      coordinates: [[26.1680, 91.7620], [26.1720, 91.7680], [26.1760, 91.7740]],
      status: 'BLOCKED',
      water_depth_cm: 70,
      length_km: 1.5
    }
  ],
  'india-national': []
};

export const INITIAL_SOS_REPORTS: Record<string, SOSReport[]> = {
  'emilia-romagna': [
    {
      sos_id: 'SOS-ER-101',
      id: 'SOS-ER-101',
      incident_id: 'FLD-EMR-2023',
      location: { lat: 44.2882, lng: 11.8790 },
      address: 'Via Renaccio 24, Faenza',
      category: 'trapped_person',
      description: 'Family of 4 with 2 children trapped on top floor balcony. Ground floor completely under water.',
      urgency: 'CRITICAL',
      severity: 'CRITICAL',
      people_count: 4,
      people_affected: 4,
      medical_urgency: false,
      contact_number: '+39 340 1234567',
      source: 'SIMULATED_DEMO',
      status: 'NEW',
      timestamp: '2023-05-18T06:12:00Z',
      is_demo: true
    },
    {
      sos_id: 'SOS-ER-102',
      id: 'SOS-ER-102',
      incident_id: 'FLD-EMR-2023',
      location: { lat: 44.2891, lng: 11.8805 },
      address: 'Piazza Bologna / Via Lapi, Faenza',
      category: 'medical_emergency',
      description: 'Elderly diabetic patient needing urgent insulin and dialysis evacuation. Power lost.',
      urgency: 'CRITICAL',
      severity: 'CRITICAL',
      people_count: 2,
      people_affected: 2,
      medical_urgency: true,
      contact_number: '+39 338 9876543',
      source: 'SIMULATED_DEMO',
      status: 'ACKNOWLEDGED',
      timestamp: '2023-05-18T06:22:00Z',
      is_demo: true
    },
    {
      sos_id: 'SOS-ER-103',
      id: 'SOS-ER-103',
      incident_id: 'FLD-EMR-2023',
      location: { lat: 44.2870, lng: 11.8780 },
      address: 'Via Pellico corner, Faenza',
      category: 'blocked_road',
      description: 'Road collapsed into canal; water rushing violently. Vehicles cannot cross.',
      urgency: 'HIGH',
      severity: 'HIGH',
      people_count: 8,
      people_affected: 8,
      medical_urgency: false,
      contact_number: '+39 349 5551212',
      source: 'SIMULATED_DEMO',
      status: 'ASSIGNED',
      timestamp: '2023-05-18T06:35:00Z',
      is_demo: true
    }
  ],
  'bengaluru': [
    {
      sos_id: 'SOS-BLR-101',
      id: 'SOS-BLR-101',
      incident_id: 'FLD-BLR-DEMO',
      location: { lat: 12.9285, lng: 77.6855 },
      address: 'EcoSpace Business Park, Campus 2B Mezzanine, ORR Bellandur',
      category: 'trapped_person',
      description: 'Security staff and 5 tech campus night-shift personnel stranded on facility mezzanine above inundated basement parking lot. Water depth ~1.2m.',
      urgency: 'CRITICAL',
      severity: 'CRITICAL',
      people_count: 6,
      people_affected: 6,
      medical_urgency: false,
      contact_number: '+91 98450 12345',
      source: 'SIMULATED_DEMO',
      status: 'NEW',
      timestamp: '2024-09-05T13:45:00Z',
      is_demo: true
    },
    {
      sos_id: 'SOS-BLR-102',
      id: 'SOS-BLR-102',
      incident_id: 'FLD-BLR-DEMO',
      location: { lat: 12.9438, lng: 77.6762 },
      address: 'Yamalur Lake Weir Colony, Near Windflower Villas, Yamalur',
      category: 'medical_emergency',
      description: 'Elderly couple marooned in ground-floor villa following secondary culvert overflow. Oxygen concentrator battery expiring in 45 minutes.',
      urgency: 'CRITICAL',
      severity: 'CRITICAL',
      people_count: 2,
      people_affected: 2,
      medical_urgency: true,
      contact_number: '+91 94480 87654',
      source: 'SIMULATED_DEMO',
      status: 'ACKNOWLEDGED',
      timestamp: '2024-09-05T14:10:00Z',
      is_demo: true
    },
    {
      sos_id: 'SOS-BLR-103',
      id: 'SOS-BLR-103',
      incident_id: 'FLD-BLR-DEMO',
      location: { lat: 12.9355, lng: 77.7012 },
      address: 'Panathur Railway Underpass & Dinne Anjaneya Swamy Temple Rd',
      category: 'blocked_road',
      description: 'BMTC feeder bus submerged up to window level under railway underpass. 12 commuters evacuated onto bridge abutment, seeking boat transfer.',
      urgency: 'HIGH',
      severity: 'HIGH',
      people_count: 12,
      people_affected: 12,
      medical_urgency: false,
      contact_number: '+91 99001 55432',
      source: 'SIMULATED_DEMO',
      status: 'ASSIGNED',
      timestamp: '2024-09-05T14:35:00Z',
      is_demo: true
    },
    {
      sos_id: 'SOS-BLR-104',
      id: 'SOS-BLR-104',
      incident_id: 'FLD-BLR-DEMO',
      location: { lat: 12.9150, lng: 77.7125 },
      address: 'Rainbow Drive Layout, Sarjapur Main Road',
      category: 'trapped_person',
      description: 'Ground floor inundation in 14 residences due to storm runoff surge into holding pond. 8 residents requesting tractor / inflatable raft extraction.',
      urgency: 'HIGH',
      severity: 'HIGH',
      people_count: 8,
      people_affected: 8,
      medical_urgency: false,
      contact_number: '+91 98860 33211',
      source: 'SIMULATED_DEMO',
      status: 'ASSIGNED',
      timestamp: '2024-09-05T15:00:00Z',
      is_demo: true
    }
  ],
  'mumbai': [],
  'chennai': [],
  'kerala': [],
  'guwahati': [],
  'india-national': []
};

export const INITIAL_DAMAGE_REPORTS: Record<string, DamageReport[]> = {
  'emilia-romagna': [
    {
      assessment_id: 'DMG-ER-01',
      id: 'DMG-ER-01',
      incident_id: 'FLD-EMR-2023',
      location: { lat: 44.2890, lng: 11.8810 },
      infrastructure_type: 'BRIDGES',
      structure_type: 'bridge',
      damage_level: 'SEVERE',
      evidence_source: 'OPERATOR VERIFIED',
      confidence: 0.95,
      description: 'Ponte delle Grazie pedestrian bridge approach undermined by violent Lamone flood debris.',
      economic_impact_estimate: '€2.5M',
      reconstruction_priority: 5,
      timestamp: '2023-05-18T07:15:00Z',
      is_demo: true
    },
    {
      assessment_id: 'DMG-ER-02',
      id: 'DMG-ER-02',
      incident_id: 'FLD-EMR-2023',
      location: { lat: 44.2875, lng: 11.8790 },
      infrastructure_type: 'BUILDINGS',
      structure_type: 'residential',
      damage_level: 'SEVERE',
      evidence_source: 'AERIAL IMAGERY',
      confidence: 0.92,
      description: 'Cluster of 18 residential row houses flooded up to 2.2m ceiling level.',
      economic_impact_estimate: '€4.1M',
      reconstruction_priority: 4,
      timestamp: '2023-05-18T07:20:00Z',
      is_demo: true
    },
    {
      assessment_id: 'DMG-ER-03',
      id: 'DMG-ER-03',
      incident_id: 'FLD-EMR-2023',
      location: { lat: 44.2950, lng: 11.8720 },
      infrastructure_type: 'ROADS',
      structure_type: 'road',
      damage_level: 'MODERATE',
      evidence_source: 'SATELLITE-DERIVED',
      confidence: 0.88,
      description: 'Asphalt scouring and drainage collapse along secondary municipal feeder route.',
      economic_impact_estimate: '€650k',
      reconstruction_priority: 3,
      timestamp: '2023-05-18T07:30:00Z',
      is_demo: true
    }
  ],
  'bengaluru': [
    {
      assessment_id: 'DMG-BLR-01',
      id: 'DMG-BLR-01',
      incident_id: 'FLD-BLR-DEMO',
      location: { lat: 12.9280, lng: 77.6845 },
      infrastructure_type: 'BUILDINGS',
      structure_type: 'commercial',
      damage_level: 'SEVERE',
      evidence_source: 'OPERATOR VERIFIED',
      confidence: 0.96,
      description: 'EcoSpace Campus 2B electrical substation & basement transformer yard flooded (1.4m water depth), diesel backup generators submerged.',
      economic_impact_estimate: '₹18.5 Cr',
      reconstruction_priority: 5,
      timestamp: '2024-09-05T15:15:00Z',
      is_demo: true
    },
    {
      assessment_id: 'DMG-BLR-02',
      id: 'DMG-BLR-02',
      incident_id: 'FLD-BLR-DEMO',
      location: { lat: 12.9430, lng: 77.6775 },
      infrastructure_type: 'UTILITIES',
      structure_type: 'canal',
      damage_level: 'SEVERE',
      evidence_source: 'AERIAL IMAGERY',
      confidence: 0.93,
      description: 'Yamalur primary storm drain (Rajakaluve) retaining wall collapsed over 45m span, dumping silt and debris across feeder roads.',
      economic_impact_estimate: '₹6.2 Cr',
      reconstruction_priority: 5,
      timestamp: '2024-09-05T15:30:00Z',
      is_demo: true
    },
    {
      assessment_id: 'DMG-BLR-03',
      id: 'DMG-BLR-03',
      incident_id: 'FLD-BLR-DEMO',
      location: { lat: 12.9348, lng: 77.6995 },
      infrastructure_type: 'ROADS',
      structure_type: 'road',
      damage_level: 'MODERATE',
      evidence_source: 'SATELLITE-DERIVED',
      confidence: 0.89,
      description: 'Panathur railway underpass drainage pump house silted up; bitumen erosion across 800m of approach road.',
      economic_impact_estimate: '₹2.8 Cr',
      reconstruction_priority: 4,
      timestamp: '2024-09-05T16:00:00Z',
      is_demo: true
    },
    {
      assessment_id: 'DMG-BLR-04',
      id: 'DMG-BLR-04',
      incident_id: 'FLD-BLR-DEMO',
      location: { lat: 12.9152, lng: 77.7120 },
      infrastructure_type: 'BUILDINGS',
      structure_type: 'residential',
      damage_level: 'MODERATE',
      evidence_source: 'OPERATOR VERIFIED',
      confidence: 0.91,
      description: 'Rainbow Drive perimeter drainage retention bund overflow damaged 12 residential boundary structures and ground level electrical panels.',
      economic_impact_estimate: '₹4.1 Cr',
      reconstruction_priority: 3,
      timestamp: '2024-09-05T16:30:00Z',
      is_demo: true
    }
  ],
  'mumbai': [],
  'chennai': [],
  'kerala': [],
  'guwahati': [],
  'india-national': []
};
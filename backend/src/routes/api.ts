import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { store } from '../db/store.js';
import { copernicusService } from '../services/copernicusService.js';
import { sarProcessor } from '../services/sarProcessor.js';
import { visionService } from '../services/visionService.js';
import { priorityEngine } from '../services/priorityEngine.js';
import { resourceService } from '../services/resourceService.js';
import { routingService } from '../services/routingService.js';
import { geminiService } from '../services/geminiService.js';
import { SOSReport, DamageReport, Incident, ResourceItem } from '../types.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `aerial-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp|tiff|gif)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

export const apiRouter = Router();

// 1. Technical System Status (Section 24)
apiRouter.get('/status', (_req: Request, res: Response) => {
  res.json(store.getSystemStatus());
});

// 2. Presets & AOI Selection (Section 6)
apiRouter.get('/presets', (_req: Request, res: Response) => {
  res.json({
    presets: store.getPresets(),
    activePresetId: store.getCurrentPresetId(),
    activePreset: store.getCurrentPreset()
  });
});

apiRouter.post('/presets/select', (req: Request, res: Response) => {
  const { presetId, customBounds } = req.body;
  if (customBounds) {
    const preset = store.setCustomBounds(customBounds);
    return res.json({ success: true, activePreset: preset });
  }
  if (presetId) {
    const preset = store.setPreset(presetId);
    return res.json({ success: true, activePreset: preset });
  }
  res.status(400).json({ error: 'Either presetId or customBounds is required.' });
});

// 3. Incidents CRUD & Situation Fusion (Stage 6)
apiRouter.get('/incidents', (_req: Request, res: Response) => {
  const incidents = store.getIncidents();
  res.json(incidents);
});

apiRouter.get('/incidents/:id', (req: Request, res: Response) => {
  const incident = store.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json(incident);
});

apiRouter.post('/incidents', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.name && !body.description && !body.event) {
    return res.status(400).json({ error: 'Incident name or description is required.' });
  }

  const newIncident: Incident = {
    incident_id: body.incident_id || `FLD-${Date.now().toString().slice(-4)}`,
    name: body.name || body.event || 'Emergency Inundation Sector',
    event: body.event || body.name || 'Emergency Inundation Incident',
    hazard: body.hazard || 'Flood',
    status: body.status || 'ACTIVE',
    severity: body.severity || body.risk_level || 'HIGH',
    source: body.source || 'OPERATOR INGESTION',
    description: body.description || body.notes || body.name || 'Operator initiated disaster incident',
    location: body.location || { lat: 44.30, lng: 11.90 },
    flood_severity: body.flood_severity ?? 0.70,
    risk_level: body.risk_level || body.severity || 'HIGH',
    sos_reports: body.sos_reports || 0,
    people_detected: body.people_detected || 0,
    people_affected: body.people_affected || 20,
    road_status: body.road_status || 'OPEN',
    damage_level: body.damage_level || 'MODERATE',
    priority: body.priority || body.severity || 'HIGH',
    assigned_resource_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: body.is_demo !== undefined ? body.is_demo : true,
    notes: body.notes
  };

  const created = store.addIncident(newIncident);
  store.addAuditLog({
    incident_id: created.incident_id,
    data_source: 'Operator Console',
    operation: 'Incident Registration',
    timestamp: new Date().toISOString(),
    result: `Incident ${created.incident_id} created with initial severity ${created.severity}`,
    status: 'COMPLETED'
  });
  res.status(201).json(created);
});

// 4. Citizen SOS System (Stage 6)
apiRouter.get('/sos', (_req: Request, res: Response) => {
  res.json(store.getSOSReports());
});

apiRouter.get('/incidents/:id/sos', (req: Request, res: Response) => {
  const incidentId = req.params.id;
  const reports = store.getSOSByIncidentId(incidentId);
  res.json(reports);
});

apiRouter.post('/sos', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.description && !body.category) {
    return res.status(400).json({ error: 'Description or category is required.' });
  }

  const urgency = body.urgency || body.severity || 'CRITICAL';
  const peopleCount = body.people_count ? parseInt(body.people_count, 10) : (body.people_affected ? parseInt(body.people_affected, 10) : 1);
  const activeIncidents = store.getIncidents();
  const defaultIncId = activeIncidents.length > 0 ? activeIncidents[0].incident_id : (store.getCurrentPresetId() === 'bengaluru' ? 'FLD-BLR-DEMO' : 'FLD-EMR-2023');
  const incidentId = body.incident_id || defaultIncId;

  const reportId = `SOS-${Date.now().toString().slice(-5)}`;
  const report: SOSReport = {
    sos_id: reportId,
    id: reportId,
    incident_id: incidentId,
    location: body.location || { lat: 44.2885, lng: 11.8795 },
    address: body.address || 'Reported via Citizen Interface',
    category: body.category || 'trapped_person',
    description: body.description || 'Citizen emergency SOS call',
    urgency,
    severity: urgency,
    people_count: peopleCount,
    people_affected: peopleCount,
    medical_urgency: Boolean(body.medical_urgency),
    contact_number: body.contact_number,
    source: body.source || 'SIMULATED_DEMO',
    status: 'NEW',
    timestamp: new Date().toISOString(),
    is_demo: true
  };

  const saved = store.addSOSReport(report);
  store.addAuditLog({
    incident_id: incidentId,
    data_source: report.source === 'CITIZEN' ? 'Citizen Interface' : 'Simulation Intake',
    operation: 'SOS Distress Intake',
    timestamp: saved.timestamp,
    result: `SOS ${report.sos_id} logged (${report.urgency}, ${report.people_count} people)`,
    status: report.source === 'SIMULATED_DEMO' ? 'SIMULATED DEMONSTRATION' : 'COMPLETED'
  });
  res.status(201).json(saved);
});

apiRouter.post('/incidents/:id/sos', (req: Request, res: Response) => {
  const incidentId = req.params.id;
  const incident = store.getIncidentById(incidentId);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  const body = req.body;
  const urgency = body.urgency || body.severity || 'CRITICAL';
  const peopleCount = body.people_count ? parseInt(body.people_count, 10) : (body.people_affected ? parseInt(body.people_affected, 10) : 2);

  const reportId = `SOS-${Date.now().toString().slice(-5)}`;
  const report: SOSReport = {
    sos_id: reportId,
    id: reportId,
    incident_id: incident.incident_id,
    location: body.location || incident.location,
    address: body.address || incident.name || 'Faenza Sector',
    category: body.category || 'trapped_person',
    description: body.description || 'Direct SOS call associated with incident',
    urgency,
    severity: urgency,
    people_count: peopleCount,
    people_affected: peopleCount,
    medical_urgency: Boolean(body.medical_urgency),
    contact_number: body.contact_number,
    source: body.source || 'SIMULATED_DEMO',
    status: 'NEW',
    timestamp: new Date().toISOString(),
    is_demo: true
  };

  const saved = store.addSOSReport(report);
  res.status(201).json(saved);
});

apiRouter.patch('/incidents/:id/sos/:sosId', (req: Request, res: Response) => {
  const { sosId } = req.params;
  const { status, urgency } = req.body;
  const updated = store.updateSOSReport(sosId, {
    ...(status ? { status } : {}),
    ...(urgency ? { urgency, severity: urgency } : {})
  });

  if (!updated) {
    return res.status(404).json({ error: 'SOS report not found' });
  }
  res.json(updated);
});

apiRouter.patch('/sos/:sosId', (req: Request, res: Response) => {
  const { sosId } = req.params;
  const updated = store.updateSOSReport(sosId, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'SOS report not found' });
  }
  res.json(updated);
});

// 5. Damage Assessment (Section 19, 21)
apiRouter.get('/damage', (_req: Request, res: Response) => {
  res.json(store.getDamageReports());
});

apiRouter.post('/incidents/:id/damage', (req: Request, res: Response) => {
  const incidentId = req.params.id;
  const incident = store.getIncidentById(incidentId);
  const dmgId = `DMG-${Date.now().toString().slice(-5)}`;
  const report: DamageReport = {
    id: dmgId,
    assessment_id: dmgId,
    incident_id: incidentId,
    location: req.body.location || (incident ? incident.location : { lat: 44.29, lng: 11.88 }),
    infrastructure_type: req.body.infrastructure_type || req.body.structure_type || 'BUILDINGS',
    structure_type: req.body.structure_type || 'residential',
    damage_level: req.body.damage_level || 'SEVERE',
    evidence_source: req.body.evidence_source || 'OPERATOR VERIFIED',
    confidence: req.body.confidence || 0.90,
    description: req.body.description || 'Structural damage reported',
    economic_impact_estimate: req.body.economic_impact_estimate || '€1.2M',
    reconstruction_priority: req.body.reconstruction_priority ? parseInt(req.body.reconstruction_priority, 10) : 4,
    timestamp: new Date().toISOString(),
    is_demo: true
  };

  const saved = store.addDamageReport(report);
  res.status(201).json(saved);
});

// 6. Transparent Priority Scoring Engine (Section 16)
apiRouter.get('/incidents/:id/priority', (req: Request, res: Response) => {
  const incident = store.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  const linkedSos = store.getSOSReports().filter(s => s.incident_id === incident.incident_id);
  const breakdown = priorityEngine.calculate(incident, linkedSos);
  res.json(breakdown);
});

apiRouter.get('/priority/weights', (_req: Request, res: Response) => {
  res.json(priorityEngine.getWeights());
});

apiRouter.post('/priority/weights', (req: Request, res: Response) => {
  const updated = priorityEngine.setWeights(req.body);
  store.runFusion(); // re-fuse with new weights
  res.json({ success: true, weights: updated });
});

// 7. Sentinel-1 Satellite Remote Sensing (Section 7, 8, 9, 10, 11)
apiRouter.get('/satellite/latest', (_req: Request, res: Response) => {
  const presetId = store.getCurrentPresetId();
  const obs = copernicusService.getLatestObservation(presetId);
  res.json(obs);
});

apiRouter.get('/satellite/search', async (req: Request, res: Response) => {
  const bounds = store.getCurrentPreset().bounds;
  const result = await copernicusService.searchScenes(bounds);
  res.json(result);
});

apiRouter.post('/satellite/process', (req: Request, res: Response) => {
  const preset = store.getCurrentPreset();
  const { threshold_db, mode, water_cutoff_db, mmu_pixels, exclude_permanent_water, apply_speckle_filter } = req.body;

  const result = sarProcessor.process({
    aoi_name: preset.name,
    bounds: preset.bounds,
    threshold_db,
    mode,
    water_cutoff_db,
    mmu_pixels,
    exclude_permanent_water,
    apply_speckle_filter
  });

  store.setSARResult(result);
  res.json(result);
});

apiRouter.get('/satellite/current-result', (_req: Request, res: Response) => {
  const sar = store.getSARResult();
  if (!sar) {
    const defaultSar = sarProcessor.process({
      aoi_name: store.getCurrentPreset().name,
      bounds: store.getCurrentPreset().bounds,
      mode: 'STANDARD'
    });
    store.setSARResult(defaultSar);
    return res.json(defaultSar);
  }
  res.json(sar);
});

apiRouter.get('/satellite/probe', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query parameters required.' });
  }
  const preset = store.getCurrentPreset();
  const probe = sarProcessor.probePoint(lat, lng, preset.name);
  res.json(probe);
});

apiRouter.post('/satellite/probe', (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) {
    return res.status(400).json({ error: 'Valid lat and lng numeric fields required in body.' });
  }
  const preset = store.getCurrentPreset();
  const probe = sarProcessor.probePoint(numLat, numLng, preset.name);
  res.json(probe);
});

// 8. Drone & Aerial Image Analysis (Section 12, 13)
apiRouter.get('/drone/detections', (_req: Request, res: Response) => {
  res.json(store.getDroneDetections());
});

apiRouter.post('/drone/analyze', upload.single('image'), async (req: Request, res: Response) => {
  const file = req.file;
  const imageId = `IMG-${Date.now().toString().slice(-6)}`;
  const filename = file ? file.filename : 'demo_aerial_recon.jpg';

  let clientDetections: any = undefined;
  if (req.body.detections) {
    try {
      clientDetections = typeof req.body.detections === 'string'
        ? JSON.parse(req.body.detections)
        : req.body.detections;
    } catch (e) {
      console.warn('Unable to parse client-side detections payload:', e);
    }
  }

  const clientInferenceTime = req.body.inference_time_seconds
    ? parseFloat(req.body.inference_time_seconds)
    : undefined;

  const rawLat = req.body.latitude ? parseFloat(req.body.latitude) : undefined;
  const rawLng = req.body.longitude ? parseFloat(req.body.longitude) : undefined;
  const rawAlt = req.body.altitude ? parseFloat(req.body.altitude) : undefined;
  const rawHead = req.body.heading ? parseFloat(req.body.heading) : undefined;

  const georefOptions = {
    latitude: rawLat !== undefined && !isNaN(rawLat) ? rawLat : undefined,
    longitude: rawLng !== undefined && !isNaN(rawLng) ? rawLng : undefined,
    altitude: rawAlt !== undefined && !isNaN(rawAlt) ? rawAlt : undefined,
    heading: rawHead !== undefined && !isNaN(rawHead) ? rawHead : undefined
  };

  const isDemo = req.body.is_demo === 'true' || req.body.is_demo === true || (!file && !clientDetections);

  let analysis;
  if (isDemo) {
    analysis = visionService.analyzeImage(filename, imageId, true, undefined, georefOptions, 0);
  } else if (clientDetections && Array.isArray(clientDetections) && clientDetections.length > 0) {
    // Client-side WebGL engine succeeded with real detections
    analysis = visionService.analyzeImage(filename, imageId, false, clientDetections, georefOptions, clientInferenceTime);
  } else if (file && fs.existsSync(file.path)) {
    // Autonomous server-side multi-scale vision engine fallback
    analysis = await visionService.detectInImageFile(file.path, filename, imageId, georefOptions);
  } else {
    analysis = visionService.analyzeImage(filename, imageId, false, [], georefOptions, 0);
  }

  store.setDroneDetections(analysis.detections);
  res.json(analysis);
});

apiRouter.post('/drone/demo', (_req: Request, res: Response) => {
  const detections = store.loadDemoDroneDetections();
  res.json({
    imageId: 'IMG-DEMO-AERIAL',
    filename: 'demo_aerial_recon.jpg',
    imageUrl: '/demo_aerial_recon.jpg',
    detections,
    totalDetections: detections.length,
    isDemo: true
  });
});

apiRouter.post('/drone/reset', (_req: Request, res: Response) => {
  store.clearDroneDetections();
  res.json({ success: true, message: 'Drone detections cleared' });
});

apiRouter.post('/drone/georeference', (req: Request, res: Response) => {
  const { latitude, longitude, altitude, heading } = req.body;
  const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
  const lng = typeof longitude === 'number' ? longitude : parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  const detections = store.getDroneDetections().map(det => {
    const latOffset = ((det.bbox[0] - 0.5) * 0.008);
    const lngOffset = ((det.bbox[1] - 0.5) * 0.008);
    return {
      ...det,
      location: {
        lat: parseFloat((lat + latOffset).toFixed(6)),
        lng: parseFloat((lng + lngOffset).toFixed(6))
      }
    };
  });

  store.setDroneDetections(detections);
  res.json({ success: true, detections });
});

apiRouter.post('/drone/detections/:id/approve', (req: Request, res: Response) => {
  const { approved, flagged_for_rescue, notes } = req.body;
  const updated = store.updateDroneDetection(req.params.id, {
    approved: approved !== undefined ? approved : true,
    flagged_for_rescue: flagged_for_rescue !== undefined ? flagged_for_rescue : false,
    notes
  });

  if (!updated) {
    return res.status(404).json({ error: 'Detection not found' });
  }
  res.json(updated);
});

// 9. Emergency Resources & Allocation (Stage 7)
apiRouter.get('/resources', (_req: Request, res: Response) => {
  res.json(store.getResources());
});

apiRouter.post('/resources', (req: Request, res: Response) => {
  const body = req.body;
  const resId = body.resource_id || `RES-${Date.now().toString().slice(-4)}`;
  const newRes: ResourceItem = {
    resource_id: resId,
    id: resId,
    name: body.name || 'Emergency Support Asset',
    type: body.type || 'RESCUE_TEAM',
    quantity: body.quantity || 1,
    availability: body.availability || 'AVAILABLE',
    status: body.status || body.availability || 'AVAILABLE',
    location: body.location || { lat: 44.30, lng: 11.85 },
    capabilities: body.capabilities || ['Swift-Water Navigation', 'Medical First Response'],
    assigned_incident: body.assigned_incident || null,
    base_station: body.base_station || 'Central Emergency Staging Hub',
    capacity: body.capacity || 6,
    speed_kmh: body.speed_kmh || 35,
    all_terrain: Boolean(body.all_terrain),
    fuel_or_battery_pct: body.fuel_or_battery_pct || 90,
    is_demo: true
  };

  const list = store.getResources();
  list.push(newRes);
  res.status(201).json(newRes);
});

apiRouter.patch('/resources/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = store.updateResource(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  res.json(updated);
});

apiRouter.get('/incidents/:id/recommendations', (req: Request, res: Response) => {
  const incident = store.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  const rec = resourceService.findOptimalResource(
    incident,
    store.getResources(),
    store.getRoads()
  );

  const available = store.getResources().filter(r => r.status === 'AVAILABLE' || r.availability === 'AVAILABLE');
  res.json({
    incident_id: incident.incident_id,
    priority: incident.priority,
    optimal_match: rec,
    recommended_resources: available.slice(0, 3).map(r => ({
      resource_id: r.resource_id || r.id,
      name: r.name,
      type: r.type,
      location: r.location,
      availability: r.availability || r.status,
      recommendation_status: 'RECOMMENDED',
      base_station: r.base_station
    }))
  });
});

apiRouter.post('/incidents/:id/assignments', (req: Request, res: Response) => {
  const incidentId = req.params.id;
  const { resource_id } = req.body;
  if (!resource_id) {
    return res.status(400).json({ error: 'resource_id is required' });
  }

  const success = store.assignResource(resource_id, incidentId);
  if (!success) {
    return res.status(400).json({ error: 'Unable to assign resource. Verify availability and incident ID.' });
  }

  store.addAuditLog({
    incident_id: incidentId,
    data_source: 'Operator Resource Dispatch',
    operation: 'Asset Assignment Decision',
    timestamp: new Date().toISOString(),
    result: `Resource ${resource_id} assigned to incident ${incidentId}`,
    status: 'COMPLETED'
  });

  res.json({ success: true, message: `Resource ${resource_id} assigned to ${incidentId}` });
});

apiRouter.post('/incidents/:id/override', (req: Request, res: Response) => {
  const incidentId = req.params.id;
  const incident = store.getIncidentById(incidentId);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  const { adjusted_priority, priority, reassign_resource_id, override_notes, reason } = req.body;
  const newPriority = adjusted_priority || priority;
  const notes = override_notes || reason || 'Manual triage review';

  if (newPriority) {
    incident.priority = newPriority;
    incident.severity = newPriority;
    incident.risk_level = newPriority;
    if (incident.priorities) {
      incident.priorities.category = newPriority;
      incident.priorities.reasons.unshift(`Operator override: Adjusted priority to ${newPriority} (${notes})`);
    }
    store.updateIncident(incident);
  }

  if (reassign_resource_id) {
    store.assignResource(reassign_resource_id, incidentId);
  }

  store.addAuditLog({
    incident_id: incidentId,
    data_source: 'Operator Command',
    operation: 'Human Decision Override',
    timestamp: new Date().toISOString(),
    result: `Priority override to ${newPriority || incident.priority}; notes: ${notes}`,
    status: 'COMPLETED'
  });

  res.json({ success: true, incident, message: 'Operator decision recorded successfully.' });
});

apiRouter.post('/resources/recommend', (req: Request, res: Response) => {
  const { incident_id } = req.body;
  const incident = store.getIncidentById(incident_id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  const rec = resourceService.findOptimalResource(
    incident,
    store.getResources(),
    store.getRoads()
  );

  if (!rec) {
    return res.status(404).json({ error: 'No available resources to recommend.' });
  }
  res.json(rec);
});

apiRouter.post('/resources/assign', (req: Request, res: Response) => {
  const { resource_id, incident_id } = req.body;
  const success = store.assignResource(resource_id, incident_id);
  if (!success) {
    return res.status(400).json({ error: 'Unable to assign resource.' });
  }
  res.json({ success: true, message: `Resource ${resource_id} assigned to ${incident_id}` });
});

// 10. Shelters & Roads (Section 5, 18, 20)
apiRouter.get('/shelters', (_req: Request, res: Response) => {
  res.json(store.getShelters());
});

apiRouter.get('/roads', (_req: Request, res: Response) => {
  res.json(store.getRoads());
});

apiRouter.post('/routing/safe-route', (req: Request, res: Response) => {
  const { origin, destination, speed_kmh } = req.body;
  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination {lat, lng} required' });
  }

  const route = routingService.computeSafeRoute(origin, destination, store.getRoads(), speed_kmh || 30);
  res.json(route);
});

// 11. Automated SITREP Generator (Section 23)
apiRouter.post('/sitrep', (_req: Request, res: Response) => {
  const sitrep = geminiService.generateSitrep({
    locationName: store.getCurrentPreset().name,
    sarAnalysis: store.getSARResult(),
    incidents: store.getIncidents(),
    sosReports: store.getSOSReports(),
    resources: store.getResources(),
    roads: store.getRoads(),
    shelters: store.getShelters()
  });

  res.json(sitrep);
});

// 12. FLOOD-X AI Conversational Assistant (Section 22)
apiRouter.post('/chat', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'query string is required' });
  }

  const answer = await geminiService.answerQuestion(query, {
    locationName: store.getCurrentPreset().name,
    incidents: store.getIncidents(),
    resources: store.getResources(),
    roads: store.getRoads(),
    shelters: store.getShelters(),
    sarAnalysis: store.getSARResult()
  });

  res.json({ answer });
});

// 13. State Reset (for demonstrations)
apiRouter.post('/reset', (_req: Request, res: Response) => {
  store.resetAll();
  res.json({ success: true, message: 'All demo datasets re-initialized.' });
});

// 14. Subsystem Diagnostics Health (Stage 9)
apiRouter.get('/diagnostics', (_req: Request, res: Response) => {
  res.json(store.getSubsystemDiagnostics());
});

// 15. Provenance & Audit Logs (Stage 9)
apiRouter.get('/audit', (_req: Request, res: Response) => {
  res.json(store.getAuditLogs());
});
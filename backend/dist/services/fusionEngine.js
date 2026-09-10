import { priorityEngine } from './priorityEngine.js';
import { routingService } from './routingService.js';
export class FusionEngine {
    fuse(input, existingIncidents) {
        const { presetId, sarAnalysis, sosReports, droneDetections, damageReports, roads, shelters, resources } = input;
        // For existing incidents in this area, re-correlate all multi-source intelligence
        const updatedIncidents = existingIncidents.map(inc => {
            // 1. Correlate linked SOS reports (within 2.5km)
            const linkedSos = sosReports.filter(s => {
                const dist = routingService.calculateDistanceKm(s.location, inc.location);
                return dist <= 2.5;
            });
            // 2. Correlate drone detections (within 2.5km, or fallback to active primary demo incident if unprojected)
            const isPrimaryDemoIncident = inc.incident_id === 'FLD-BLR-DEMO' || inc.incident_id === 'FLD-EMR-2023';
            const linkedDetections = droneDetections.filter(d => {
                if (d.location) {
                    const dist = routingService.calculateDistanceKm(d.location, inc.location);
                    return dist <= 2.5;
                }
                return isPrimaryDemoIncident;
            });
            // Count detected people from drone
            const detectedPeopleCount = linkedDetections.filter(d => d.object_type === 'person').length;
            const peopleDetected = Math.max(inc.people_detected, detectedPeopleCount);
            // Total affected people
            const sosPeopleCount = linkedSos.reduce((acc, curr) => acc + (curr.people_affected || 1), 0);
            const peopleAffected = Math.max(inc.people_affected, sosPeopleCount + detectedPeopleCount);
            // 3. Correlate road status near incident
            let roadStatus = inc.road_status;
            for (const r of roads) {
                for (const [rLat, rLng] of r.coordinates) {
                    if (routingService.calculateDistanceKm({ lat: rLat, lng: rLng }, inc.location) < 1.0) {
                        if (r.status === 'BLOCKED')
                            roadStatus = 'BLOCKED';
                        else if (r.status === 'PARTIALLY_BLOCKED' && roadStatus !== 'BLOCKED')
                            roadStatus = 'PARTIALLY_BLOCKED';
                    }
                }
            }
            // 4. Correlate damage reports
            const linkedDamage = damageReports.filter(d => {
                return routingService.calculateDistanceKm(d.location, inc.location) <= 2.0;
            });
            let damageLevel = inc.damage_level;
            if (linkedDamage.some(d => d.damage_level === 'CRITICAL'))
                damageLevel = 'CRITICAL';
            else if (linkedDamage.some(d => d.damage_level === 'SEVERE'))
                damageLevel = 'SEVERE';
            // 5. Correlate nearest shelter
            let nearestShelter = null;
            let minShelterDist = 999;
            for (const sh of shelters) {
                const d = routingService.calculateDistanceKm(sh.location, inc.location);
                if (d < minShelterDist) {
                    minShelterDist = d;
                    nearestShelter = sh;
                }
            }
            // 6. SAR Flood severity correlation
            let floodSeverity = inc.flood_severity;
            if (sarAnalysis && sarAnalysis.flood_percentage) {
                // Boost if regional SAR flood percentage is high
                floodSeverity = Math.min(1.0, Math.max(inc.flood_severity, sarAnalysis.flood_percentage / 100));
            }
            // Create synthetic incident object to run priority engine
            const tempIncident = {
                ...inc,
                sos_reports: linkedSos.length,
                people_detected: peopleDetected,
                people_affected: peopleAffected,
                road_status: roadStatus,
                damage_level: damageLevel,
                flood_severity: floodSeverity,
                nearest_shelter_id: nearestShelter?.id || inc.nearest_shelter_id,
                distance_to_shelter_km: minShelterDist < 900 ? minShelterDist : inc.distance_to_shelter_km,
                updated_at: new Date().toISOString()
            };
            // 7. Calculate transparent priority breakdown
            const priorityResult = priorityEngine.calculate(tempIncident, linkedSos);
            // 8. Build Unified Model Summaries
            const criticalSosCount = linkedSos.filter(s => s.urgency === 'CRITICAL' || s.severity === 'CRITICAL').length;
            const highSosCount = linkedSos.filter(s => s.urgency === 'HIGH' || s.severity === 'HIGH').length;
            const medSosCount = linkedSos.filter(s => s.urgency === 'MEDIUM' || s.severity === 'MEDIUM').length;
            const lowSosCount = linkedSos.filter(s => s.urgency === 'LOW' || s.severity === 'LOW').length;
            const normalizedScore = Math.round(priorityResult.score * 100);
            return {
                ...tempIncident,
                location: {
                    ...tempIncident.location,
                    city: tempIncident.location.city || (presetId === 'bengaluru' ? 'Bengaluru' : 'Faenza'),
                    state: tempIncident.location.state || (presetId === 'bengaluru' ? 'Karnataka' : 'Emilia-Romagna'),
                    country: tempIncident.location.country || (presetId === 'bengaluru' ? 'India' : 'Italy')
                },
                event: inc.event || 'Flood Hazard Sector',
                hazard: inc.hazard || 'Flood',
                status: inc.status || 'ACTIVE',
                severity: priorityResult.category,
                source: inc.source || 'COPERNICUS SENTINEL-1 + MULTI-SENSOR FUSION',
                description: inc.description || inc.notes || inc.name || 'Active inundation sector under emergency surveillance',
                risk_level: priorityResult.category,
                priority: priorityResult.category,
                priority_breakdown: priorityResult,
                sar_analysis: {
                    source: sarAnalysis?.is_demo ? 'Sentinel-1 GRD (Calibrated Demo Scenario)' : 'Sentinel-1 GRD',
                    pre_event: {
                        timestamp: sarAnalysis?.pre_event_time || (presetId === 'bengaluru' ? '2024-08-25T12:45:00Z' : '2023-05-06T05:12:00Z'),
                        mission: 'Sentinel-1A',
                        mode: 'IW',
                        polarization: 'VV / VH'
                    },
                    post_event: {
                        timestamp: sarAnalysis?.post_event_time || (presetId === 'bengaluru' ? '2024-09-05T12:45:30Z' : '2023-05-18T05:12:19Z'),
                        mission: 'Sentinel-1A',
                        mode: 'IW',
                        polarization: 'VV / VH'
                    },
                    threshold_db: sarAnalysis?.change_threshold_db ?? -3.0,
                    flood_mask: {
                        features_count: sarAnalysis?.flood_geojson?.features?.length || 0
                    },
                    flooded_area_km2: sarAnalysis?.flooded_area_km2 || 0,
                    status: sarAnalysis?.is_demo ? 'SIMULATED' : 'REAL'
                },
                flood_analysis: {
                    inundated_area_km2: sarAnalysis?.flooded_area_km2 || (inc.flood_analysis?.inundated_area_km2 || 0),
                    flood_percentage: sarAnalysis?.flood_percentage || (inc.flood_analysis?.flood_percentage || 0),
                    mean_delta_db: sarAnalysis?.mean_delta_db || (inc.flood_analysis?.mean_delta_db || 0),
                    status: sarAnalysis ? 'SAR-derived inundation available' : 'NO SATELLITE OBSERVATION AVAILABLE',
                    source: sarAnalysis?.is_demo ? 'SIMULATED DEMONSTRATION DATA' : 'COPERNICUS SENTINEL-1'
                },
                ground_detections: {
                    total_detections: linkedDetections.length,
                    people_detected: detectedPeopleCount,
                    source: 'MODEL-DERIVED',
                    confidence_avg: linkedDetections.length > 0
                        ? parseFloat((linkedDetections.reduce((s, d) => s + d.confidence, 0) / linkedDetections.length).toFixed(2))
                        : (inc.ground_detections?.confidence_avg || 0)
                },
                sos_reports_summary: {
                    total: linkedSos.length,
                    critical: criticalSosCount,
                    high: highSosCount,
                    medium: medSosCount,
                    low: lowSosCount
                },
                resources: {
                    assigned_count: inc.assigned_resource_ids.length,
                    recommended_count: priorityResult.category === 'CRITICAL' ? 3 : priorityResult.category === 'HIGH' ? 2 : 1,
                    recommended_types: priorityResult.category === 'CRITICAL'
                        ? ['BOAT', 'RESCUE_TEAM', 'AMBULANCE']
                        : ['RESCUE_TEAM', 'AMBULANCE']
                },
                damage_assessment: {
                    total_assessed: linkedDamage.length,
                    critical_damage: linkedDamage.filter(d => d.damage_level === 'CRITICAL' || d.damage_level === 'DESTROYED').length,
                    severe_damage: linkedDamage.filter(d => d.damage_level === 'SEVERE').length,
                    summary: linkedDamage.length > 0
                        ? linkedDamage.map(d => d.description).slice(0, 2).join('; ')
                        : 'Baseline damage surveillance'
                },
                priorities: {
                    score: normalizedScore,
                    category: priorityResult.category,
                    reasons: priorityResult.reasons
                }
            };
        });
        return updatedIncidents;
    }
}
export const fusionEngine = new FusionEngine();

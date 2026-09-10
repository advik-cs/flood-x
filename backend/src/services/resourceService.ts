import { Incident, ResourceItem, RoadEdge } from '../types.js';
import { routingService, CalculatedRoute } from './routingService.js';

export interface ResourceRecommendation {
  resource: ResourceItem;
  distance_km: number;
  estimated_travel_mins: number;
  match_score: number;
  match_reasons: string[];
  suggested_route: CalculatedRoute;
}

export class ResourceService {
  public findOptimalResource(
    incident: Incident,
    resources: ResourceItem[],
    roads: RoadEdge[]
  ): ResourceRecommendation | null {
    const available = resources.filter(r => r.status === 'AVAILABLE');
    if (available.length === 0) return null;

    const scored = available.map(res => {
      const dist = routingService.calculateDistanceKm(res.location, incident.location);
      const matchReasons: string[] = [];
      let typeMultiplier = 1.0;

      if (incident.flood_severity > 0.75 && res.type === 'boat') {
        typeMultiplier += 1.5;
        matchReasons.push('High-draft flood boat suitable for deep overbank inundation');
      }

      if (incident.people_detected > 0 && (res.type === 'boat' || res.type === 'rescue_team')) {
        typeMultiplier += 1.2;
        matchReasons.push(`Carrying capacity (${res.capacity}) matches stranded victims count (${incident.people_detected})`);
      }

      if (incident.priority === 'CRITICAL' && res.type === 'ambulance') {
        typeMultiplier += 0.8;
        matchReasons.push('Rapid emergency trauma stabilization unit');
      }

      if (res.all_terrain) {
        typeMultiplier += 0.4;
        matchReasons.push('All-terrain amphibious capability allows traversing mud and water');
      }

      // Proximity score: closer is better
      const proximityScore = Math.max(0.1, 10 - dist);
      const compositeMatch = proximityScore * typeMultiplier;

      const route = routingService.computeSafeRoute(res.location, incident.location, roads, res.speed_kmh);

      return {
        resource: res,
        distance_km: dist,
        estimated_travel_mins: route.estimated_time_mins,
        match_score: parseFloat(compositeMatch.toFixed(2)),
        match_reasons: matchReasons,
        suggested_route: route
      };
    });

    // Sort by highest match score
    scored.sort((a, b) => b.match_score - a.match_score);
    return scored[0];
  }
}

export const resourceService = new ResourceService();
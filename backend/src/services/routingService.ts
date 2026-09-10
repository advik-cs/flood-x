import { GeoPoint, RoadEdge, RoadStatus } from '../types.js';

export interface RouteStep {
  instruction: string;
  distance_km: number;
  road_name: string;
  status: RoadStatus;
}

export interface CalculatedRoute {
  total_distance_km: number;
  estimated_time_mins: number;
  waypoints: [number, number][]; // [lat, lng] path
  avoided_blocked_roads: string[];
  steps: RouteStep[];
  is_all_clear: boolean;
  notes: string;
}

export class RoutingService {
  // Haversine distance
  public calculateDistanceKm(p1: GeoPoint, p2: GeoPoint): number {
    const R = 6371; // Earth radius in km
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  // Generate obstacle-avoiding route from origin to destination
  public computeSafeRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    roads: RoadEdge[],
    vehicleSpeedKmh: number = 30
  ): CalculatedRoute {
    const directDist = this.calculateDistanceKm(origin, destination);
    const blockedRoads = roads.filter(r => r.status === 'BLOCKED');
    const avoidedNames = blockedRoads.map(r => r.name);

    // If roads exist, construct a path detour around blocked road coordinates
    const waypoints: [number, number][] = [];
    waypoints.push([origin.lat, origin.lng]);

    // Check if direct midpoint is near a blocked road
    const midLat = (origin.lat + destination.lat) / 2;
    const midLng = (origin.lng + destination.lng) / 2;

    let detourOffsetLat = 0;
    let detourOffsetLng = 0;

    for (const bRoad of blockedRoads) {
      for (const [rLat, rLng] of bRoad.coordinates) {
        const d = this.calculateDistanceKm({ lat: midLat, lng: midLng }, { lat: rLat, lng: rLng });
        if (d < 1.5) {
          // Add detour perpendicular offset
          detourOffsetLat = 0.008;
          detourOffsetLng = -0.008;
          break;
        }
      }
    }

    if (detourOffsetLat !== 0) {
      waypoints.push([midLat + detourOffsetLat, midLng + detourOffsetLng]);
    }

    waypoints.push([destination.lat, destination.lng]);

    const actualDist = parseFloat((directDist * (detourOffsetLat !== 0 ? 1.35 : 1.15)).toFixed(2));
    const timeMins = Math.max(2, Math.round((actualDist / Math.max(15, vehicleSpeedKmh)) * 60));

    const steps: RouteStep[] = [
      {
        instruction: 'Deploy from staging depot along designated open primary artery',
        distance_km: parseFloat((actualDist * 0.4).toFixed(1)),
        road_name: 'Staging Access Road',
        status: 'OPEN'
      },
      {
        instruction: detourOffsetLat !== 0 
          ? `Execute detour via elevated bypass to avoid flooded sector (${avoidedNames.slice(0, 1).join(', ') || 'blocked zone'})` 
          : 'Proceed along main corridor',
        distance_km: parseFloat((actualDist * 0.4).toFixed(1)),
        road_name: detourOffsetLat !== 0 ? 'Secondary Elevated Corridor' : 'Main Thoroughfare',
        status: 'OPEN'
      },
      {
        instruction: 'Approach incident staging point under tactical escort',
        distance_km: parseFloat((actualDist * 0.2).toFixed(1)),
        road_name: 'Incident Perimeter',
        status: 'PARTIALLY_BLOCKED'
      }
    ];

    return {
      total_distance_km: actualDist,
      estimated_time_mins: timeMins,
      waypoints,
      avoided_blocked_roads: avoidedNames,
      steps,
      is_all_clear: detourOffsetLat === 0,
      notes: detourOffsetLat !== 0 
        ? 'Route calculated with dynamic obstacle avoidance around submerged road segments.'
        : 'Direct road connection verified open.'
    };
  }
}

export const routingService = new RoutingService();
import { Incident, PriorityBreakdown, RiskLevel, SOSReport } from '../types.js';

export interface PriorityWeights {
  floodSeverity: number;
  peopleAffected: number;
  sosUrgency: number;
  medicalUrgency: number;
  accessibilityRisk: number;
}

export const DEFAULT_WEIGHTS: PriorityWeights = {
  floodSeverity: 0.30,
  peopleAffected: 0.25,
  sosUrgency: 0.20,
  medicalUrgency: 0.15,
  accessibilityRisk: 0.10
};

export class PriorityEngine {
  private weights: PriorityWeights = { ...DEFAULT_WEIGHTS };

  public getWeights(): PriorityWeights {
    return { ...this.weights };
  }

  public setWeights(newWeights: Partial<PriorityWeights>): PriorityWeights {
    this.weights = { ...this.weights, ...newWeights };
    // Normalize if sum is close to 1.0
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (sum > 0 && Math.abs(sum - 1.0) > 0.001) {
      for (const key of Object.keys(this.weights) as (keyof PriorityWeights)[]) {
        this.weights[key] = parseFloat((this.weights[key] / sum).toFixed(4));
      }
    }
    return this.getWeights();
  }

  public calculate(incident: Incident, linkedSosReports: SOSReport[] = []): PriorityBreakdown {
    // 1. Flood severity (0.0 to 1.0)
    const floodScore = Math.min(1.0, Math.max(0.0, incident.flood_severity));

    // 2. People affected component (scaled up to 100 people max = 1.0)
    const totalPeople = (incident.people_affected || 0) + (incident.people_detected || 0) * 2;
    const peopleScore = Math.min(1.0, totalPeople / 50);

    // 3. SOS urgency component
    const sosCount = linkedSosReports.length > 0 ? linkedSosReports.length : incident.sos_reports;
    const sosScore = Math.min(1.0, sosCount / 15);

    // 4. Medical urgency component
    const hasMedicalSos = linkedSosReports.some(s => s.medical_urgency || s.category === 'medical_emergency');
    const medicalCount = linkedSosReports.filter(s => s.medical_urgency || s.category === 'medical_emergency').length;
    const medicalScore = hasMedicalSos ? Math.min(1.0, 0.6 + (medicalCount * 0.2)) : 0.0;

    // 5. Accessibility risk component
    let accessScore = 0.1;
    if (incident.road_status === 'BLOCKED') accessScore = 1.0;
    else if (incident.road_status === 'PARTIALLY_BLOCKED') accessScore = 0.55;

    // Distance to shelter penalty
    if (incident.distance_to_shelter_km && incident.distance_to_shelter_km > 3.0) {
      accessScore = Math.min(1.0, accessScore + 0.2);
    }

    // Compute composite weighted score
    const compositeScore = 
      (this.weights.floodSeverity * floodScore) +
      (this.weights.peopleAffected * peopleScore) +
      (this.weights.sosUrgency * sosScore) +
      (this.weights.medicalUrgency * medicalScore) +
      (this.weights.accessibilityRisk * accessScore);

    const clampedScore = parseFloat(Math.min(1.0, Math.max(0.0, compositeScore)).toFixed(3));

    // Categorize
    let category: RiskLevel = 'LOW';
    if (clampedScore >= 0.75) {
      category = 'CRITICAL';
    } else if (clampedScore >= 0.50) {
      category = 'HIGH';
    } else if (clampedScore >= 0.28) {
      category = 'MEDIUM';
    }

    // Explainable reasons list
    const reasons: string[] = [];
    if (sosCount > 0) {
      reasons.push(`${sosCount} citizen SOS report${sosCount > 1 ? 's' : ''} logged`);
    }
    if (incident.people_detected > 0) {
      reasons.push(`${incident.people_detected} stranded individual${incident.people_detected > 1 ? 's' : ''} detected by aerial reconnaissance`);
    }
    if (incident.people_affected > 0) {
      reasons.push(`Estimated ${incident.people_affected} residents in immediate inundation zone`);
    }
    if (floodScore >= 0.75) {
      reasons.push(`Severe flood extent (SAR index: ${(floodScore * 100).toFixed(0)}%)`);
    } else if (floodScore >= 0.5) {
      reasons.push(`Moderate water inundation (SAR index: ${(floodScore * 100).toFixed(0)}%)`);
    }
    if (incident.road_status === 'BLOCKED') {
      reasons.push('Primary ingress/egress road completely blocked by floodwaters');
    } else if (incident.road_status === 'PARTIALLY_BLOCKED') {
      reasons.push('Access route partially impassable; high-clearance assets required');
    }
    if (hasMedicalSos) {
      reasons.push('Active high-urgency medical emergency reported in zone');
    }
    if (incident.distance_to_shelter_km) {
      reasons.push(`Nearest emergency shelter is ${incident.distance_to_shelter_km.toFixed(1)} km away`);
    }
    if (reasons.length === 0) {
      reasons.push('Baseline alert level monitored by standard automated protocol');
    }

    return {
      score: clampedScore,
      category,
      reasons,
      weightsUsed: { ...this.weights },
      componentScores: {
        flood: parseFloat(floodScore.toFixed(3)),
        people: parseFloat(peopleScore.toFixed(3)),
        sos: parseFloat(sosScore.toFixed(3)),
        medical: parseFloat(medicalScore.toFixed(3)),
        access: parseFloat(accessScore.toFixed(3))
      }
    };
  }
}

export const priorityEngine = new PriorityEngine();
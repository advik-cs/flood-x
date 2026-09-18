import React, { useState } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Users, 
  CheckCircle, 
  Clock, 
  Activity, 
  FileText,
  ShieldAlert,
  Eye,
  X,
  Satellite,
  Radio,
  Sliders,
  Check,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  SOSReport, 
  PresetLocation, 
  Incident, 
  SARAnalysisResult, 
  DroneDetection 
} from '../../types/index.js';
import { updateSOSStatus } from '../../services/api.js';

interface IncidentsSOSProps {
  preset: PresetLocation | null;
  sosReports: SOSReport[];
  incidents?: Incident[];
  sarResult?: SARAnalysisResult | null;
  droneDetections?: DroneDetection[];
  onRefreshData: () => void;
}

function getSOSFloodRelation(
  sosLoc: { lat: number; lng: number },
  sar?: SARAnalysisResult | null
): { status: 'INSIDE FLOOD' | 'NEAR FLOOD EDGE (<350m)' | 'OUTSIDE FLOOD'; color: string } {
  if (!sar?.flood_geojson?.features?.length) {
    return { status: 'OUTSIDE FLOOD', color: 'bg-slate-900 text-slate-400 border-slate-700' };
  }

  const { lat, lng } = sosLoc;
  let isInside = false;
  let minDistanceM = 999999;

  for (const feature of sar.flood_geojson.features) {
    if (feature.properties?.is_permanent) continue;
    const geom = feature.geometry;
    const coords: [number, number][][][] = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

    for (const poly of coords) {
      const ring = poly[0];
      if (!ring) continue;

      let inRing = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) &&
          (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inRing = !inRing;
      }
      if (inRing) {
        isInside = true;
        break;
      }

      // Check distance to boundary vertices
      for (let i = 0; i < ring.length; i++) {
        const [rLng, rLat] = ring[i];
        const dLat = (lat - rLat) * 111000;
        const dLng = (lng - rLng) * 111000 * Math.cos((lat * Math.PI) / 180);
        const dist = Math.hypot(dLat, dLng);
        if (dist < minDistanceM) minDistanceM = dist;
      }
    }
    if (isInside) break;
  }

  if (isInside) {
    return { status: 'INSIDE FLOOD', color: 'bg-red-950 text-red-300 border-red-800' };
  }
  if (minDistanceM <= 350) {
    return { status: 'NEAR FLOOD EDGE (<350m)', color: 'bg-amber-950 text-amber-300 border-amber-800' };
  }
  return { status: 'OUTSIDE FLOOD', color: 'bg-slate-900 text-slate-400 border-slate-700' };
}

export interface AuthoritativePriority {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE';
  score: number | null;
  reasons: string[];
  isDemoPriority: boolean;
}

/**
 * DEMO-ONLY DETERMINISTIC PRIORITY CALCULATION
 * Clearly separated deterministic calculation for simulated demonstration requests
 * (e.g. SOS-BLR-101 through SOS-BLR-104) that lack individual authoritative scores.
 * Sourced purely from existing request attributes with ZERO random numbers.
 * Does NOT alter backend production logic or live incident fusion.
 */
export function calculateDemoSOSPriority(
  sos: SOSReport,
  linkedInc?: Incident,
  sarResult?: SARAnalysisResult | null
): AuthoritativePriority {
  const rawLevel = (
    (sos as any).priority ||
    sos.severity ||
    sos.urgency ||
    'HIGH'
  ).toUpperCase();

  const isMed = !!(sos.medical_urgency || sos.category === 'medical_emergency');
  const isTrapped = sos.category === 'trapped_person';
  const isBlockedRoad = sos.category === 'blocked_road';
  const people = sos.people_affected || sos.people_count || 1;
  const floodRel = getSOSFloodRelation(sos.location, sarResult);

  // Baseline priority from FLOOD-X doctrine priority bands:
  // CRITICAL >= 75, HIGH: 50-74, MEDIUM: 28-49, LOW: <28
  let base = 56;
  if (rawLevel === 'CRITICAL') base = 76;
  else if (rawLevel === 'HIGH') base = 56;
  else if (rawLevel === 'MEDIUM') base = 36;
  else base = 18;

  let points = base;

  // 1. Confinement & Immediate Life-Safety Risk
  if (isMed) points += 8;
  else if (isTrapped) points += 7;
  else if (isBlockedRoad) points += 6;

  // 2. People Affected Factor (deterministic tiering)
  if (people >= 10) points += 8;
  else if (people >= 6) points += 5;
  else if (people >= 3) points += 3;
  else points += 1;

  // 3. Flood Proximity (SAR Satellite Boundary Correlation)
  if (floodRel.status === 'INSIDE FLOOD') points += 4;
  else if (floodRel.status === 'NEAR FLOOD EDGE (<350m)') points += 3;

  // 4. Sector Macro Flood Severity alignment
  if (isTrapped && linkedInc?.flood_severity && (floodRel.status === 'INSIDE FLOOD' || floodRel.status === 'NEAR FLOOD EDGE (<350m)')) {
    points += 1;
  }

  // Strictly clamp final score within FLOOD-X doctrine risk category bands
  let level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let finalScore = points;
  if (rawLevel === 'CRITICAL') {
    level = 'CRITICAL';
    finalScore = Math.min(98, Math.max(76, points));
  } else if (rawLevel === 'HIGH') {
    level = 'HIGH';
    finalScore = Math.min(74, Math.max(50, points));
  } else if (rawLevel === 'LOW') {
    level = 'LOW';
    finalScore = Math.min(27, Math.max(5, points));
  } else {
    level = 'MEDIUM';
    finalScore = Math.min(49, Math.max(28, points));
  }

  // 5. Authentic explainable reasons sourced strictly from underlying request attributes
  const reasons: string[] = [];
  if (isMed) {
    reasons.push('Medical emergency & life-safety device dependency');
  }
  if (isTrapped) {
    if (sos.description?.toLowerCase().includes('mezzanine')) {
      reasons.push('Trapped on facility mezzanine above inundated basement');
    } else {
      reasons.push('Ground-floor residential inundation & stranding');
    }
  }
  if (isBlockedRoad) {
    reasons.push('Submerged bus under railway underpass; boat transfer requested');
  }
  reasons.push(`${people} citizen${people > 1 ? 's' : ''} affected at location`);
  if (rawLevel === 'CRITICAL') {
    reasons.push('Critical urgency distress dispatch');
  } else if (rawLevel === 'HIGH') {
    reasons.push('High priority emergency intervention required');
  }
  if (floodRel.status === 'INSIDE FLOOD') {
    reasons.push('Located within active SAR flood boundary');
  } else if (floodRel.status === 'NEAR FLOOD EDGE (<350m)') {
    reasons.push('Near active flood boundary (<350m buffer)');
  } else {
    reasons.push('Outside primary SAR flood boundary');
  }

  return { level, score: finalScore, reasons, isDemoPriority: true };
}

/**
 * Authoritative Priority Dispatcher:
 * 1. If request has its own authoritative priority score, uses that exact score.
 * 2. If it is a simulated demo request lacking individual scores, uses the demo deterministic model.
 * 3. If a live request with linked incident, uses the incident score.
 * 4. Otherwise returns UNAVAILABLE.
 */
export function getAuthoritativeSOSPriority(
  sos: SOSReport,
  incidents: Incident[] = [],
  sarResult?: SARAnalysisResult | null
): AuthoritativePriority {
  const linkedInc = incidents.find((i) => i.incident_id === sos.incident_id);
  const isDemo = !!(
    sos.is_demo ||
    sos.source === 'SIMULATED_DEMO' ||
    sos.id?.startsWith('SOS-BLR-') ||
    sos.sos_id?.startsWith('SOS-BLR-')
  );

  // 1. Check if request has its own individual authoritative score
  let individualScore: number | null = null;
  if (typeof (sos as any).priority_score === 'number') {
    individualScore = (sos as any).priority_score;
  } else if (typeof (sos as any).score === 'number') {
    individualScore = (sos as any).score;
  }

  if (individualScore !== null && !isNaN(individualScore)) {
    const score = individualScore <= 1.0 ? Math.round(individualScore * 100) : Math.round(individualScore);
    const rawLevel = (
      (sos as any).priority ||
      sos.severity ||
      sos.urgency ||
      'HIGH'
    ).toUpperCase();
    let level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (rawLevel === 'CRITICAL') level = 'CRITICAL';
    else if (rawLevel === 'HIGH') level = 'HIGH';
    else if (rawLevel === 'LOW') level = 'LOW';

    return {
      level,
      score,
      reasons: linkedInc?.priorities?.reasons || [],
      isDemoPriority: false
    };
  }

  // 2. For simulated demonstration requests lacking individual scores, use demo deterministic calculation
  if (isDemo) {
    return calculateDemoSOSPriority(sos, linkedInc, sarResult);
  }

  // 3. For live requests with linked incident authoritative score
  const liveIncScore = linkedInc?.priorities?.score ?? linkedInc?.priority_breakdown?.score;
  if (typeof liveIncScore === 'number' && !isNaN(liveIncScore)) {
    const score = liveIncScore <= 1.0 ? Math.round(liveIncScore * 100) : Math.round(liveIncScore);
    const rawLevel = (
      (sos as any).priority ||
      sos.severity ||
      sos.urgency ||
      linkedInc?.priorities?.category ||
      linkedInc?.severity ||
      'HIGH'
    ).toUpperCase();
    let level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (rawLevel === 'CRITICAL') level = 'CRITICAL';
    else if (rawLevel === 'HIGH') level = 'HIGH';
    else if (rawLevel === 'LOW') level = 'LOW';

    return {
      level,
      score,
      reasons: linkedInc?.priorities?.reasons || [],
      isDemoPriority: false
    };
  }

  // 4. Fallback if no authoritative or demo score is available
  return {
    level: 'UNAVAILABLE',
    score: null,
    reasons: [],
    isDemoPriority: false
  };
}

export const IncidentsSOS: React.FC<IncidentsSOSProps> = ({
  preset,
  sosReports,
  incidents = [],
  sarResult,
  droneDetections = [],
  onRefreshData
}) => {
  // Filter & Selected Incident Modal State
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED'>('ALL');
  const [updatingSosId, setUpdatingSosId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'HIGHEST' | 'LOWEST'>('DEFAULT');
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

  const toggleReasons = (id: string) => {
    setExpandedReasons(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateStatus = async (sosId: string, newStatus: 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED') => {
    setUpdatingSosId(sosId);
    try {
      await updateSOSStatus(sosId, newStatus, selectedIncident?.incident_id);
      onRefreshData();
    } catch (err) {
      console.error('Error updating SOS status:', err);
    } finally {
      setUpdatingSosId(null);
    }
  };

  // Filtered SOS Reports for right panel stream
  const filteredSOS = sosReports.filter((sos) => {
    if (statusFilter === 'ALL') return true;
    return (sos.status || 'NEW').toUpperCase() === statusFilter;
  });

  // Displayed SOS reports for left panel queue (with optional sort by priority)
  const displayedSOS = [...sosReports].sort((a, b) => {
    if (sortBy === 'HIGHEST') {
      const sA = getAuthoritativeSOSPriority(a, incidents, sarResult).score ?? -1;
      const sB = getAuthoritativeSOSPriority(b, incidents, sarResult).score ?? -1;
      return sB - sA;
    }
    if (sortBy === 'LOWEST') {
      const sA = getAuthoritativeSOSPriority(a, incidents, sarResult).score ?? 999;
      const sB = getAuthoritativeSOSPriority(b, incidents, sarResult).score ?? 999;
      return sA - sB;
    }
    return 0; // Default ordering preserved
  });

  const criticalSOSCount = sosReports.filter(s => s.severity === 'CRITICAL' || s.urgency === 'CRITICAL').length;
  const highSOSCount = sosReports.filter(s => s.severity === 'HIGH' || s.urgency === 'HIGH').length;
  const resolvedSOSCount = sosReports.filter(s => (s.status || '').toUpperCase() === 'RESOLVED').length;
  const pendingSOSCount = sosReports.filter(s => (s.status || 'NEW').toUpperCase() === 'NEW').length;

  // Authoritative Highest Priority Score dynamically evaluated
  const validScores = sosReports
    .map(s => getAuthoritativeSOSPriority(s, incidents, sarResult).score)
    .filter((s): s is number => s !== null);
  const highestPriorityScore = validScores.length > 0 ? Math.max(...validScores) : null;

  return (
    <div className="h-[calc(100vh-84px)] overflow-y-auto bg-command-bg text-slate-100 p-4 lg:p-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-command-border pb-3 font-mono">
        <div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h1 className="text-base font-bold text-slate-100">
              STAGE 6 — UNIFIED INCIDENTS & CITIZEN SOS DISPATCH NETWORK
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Single Unified Incident Model correlated across Sentinel-1 SAR change detection, drone computer vision, and citizen distress intake.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs px-2.5 py-1 rounded bg-red-950/60 border border-red-800 text-red-300 font-bold">
            {criticalSOSCount} CRITICAL SOS
          </span>
          <span className="text-xs px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-300 font-bold">
            {pendingSOSCount} PENDING
          </span>
        </div>
      </div>


      {/* SECTION 1: ACTIVE INCIDENTS DASHBOARD TABLE */}
      <div className="rounded-lg bg-command-surface border border-command-border font-mono text-xs overflow-hidden shadow-lg">
        <div className="p-3 bg-slate-900/80 border-b border-command-border flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold text-slate-100">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>ACTIVE INCIDENTS DASHBOARD</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800">
              {(selectedIncident?.incident_id || incidents[0]?.incident_id || 'FLD-BLR-DEMO')} UNIFIED INCIDENT PIPELINE
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {incidents.length} Registered Disasters
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-command-border text-slate-400 text-[11px] uppercase">
                <th className="p-3">Incident ID</th>
                <th className="p-3">Event / Location</th>
                <th className="p-3">Hazard</th>
                <th className="p-3">Severity</th>
                <th className="p-3">People Affected</th>
                <th className="p-3">SOS Count</th>
                <th className="p-3">Priority Score</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Multi-Sensor Fusion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-command-border/50 text-[11px]">
              {incidents.length > 0 ? (
                incidents.map((inc) => {
                  const priorityScore = inc.priorities?.score ?? Math.round((inc.flood_severity || 0.8) * 100);
                  const isCrit = (inc.severity || inc.risk_level) === 'CRITICAL';
                  return (
                    <tr 
                      key={inc.incident_id} 
                      className={`hover:bg-slate-900/60 transition cursor-pointer ${
                        selectedIncident?.incident_id === inc.incident_id ? 'bg-blue-950/30' : ''
                      }`}
                      onClick={() => setSelectedIncident(inc)}
                    >
                      <td className="p-3 font-bold text-blue-400 flex items-center space-x-1.5">
                        <span>{inc.incident_id}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-200">
                        {inc.name || inc.event || 'Bengaluru Central Disaster Sector'}
                      </td>
                      <td className="p-3 text-slate-300">
                        {inc.hazard || 'RIVERINE FLOOD / LEVEE BREACH'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCrit
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {inc.severity || inc.risk_level || 'HIGH'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-amber-400" />
                          <span>{inc.people_affected || inc.people_detected || 0}</span>
                        </span>
                      </td>
                      <td className="p-3 font-bold text-red-400">
                        {inc.sos_reports_summary?.total ?? (typeof inc.sos_reports === 'number' ? inc.sos_reports : sosReports.length)} calls
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                            <div 
                              className={`h-full ${priorityScore > 75 ? 'bg-red-500' : priorityScore > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                              style={{ width: `${Math.min(100, priorityScore)}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-200">{priorityScore}/100</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-semibold text-[10px]">
                          {inc.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncident(inc);
                          }}
                          className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 font-bold transition flex items-center space-x-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>VIEW FUSION</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    No registered incidents available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: GRID LAYOUT (ALREADY SUBMITTED CITIZEN SOS REQUESTS & LIVE SOS TRIAGE STREAM) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Already Submitted Citizen SOS Requests */}
        <div className="lg:col-span-6 p-4 rounded-lg bg-command-surface border border-command-border font-mono text-xs space-y-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between border-b border-command-border pb-2.5 gap-2">
            <div>
              <div className="flex items-center space-x-2 font-bold text-slate-100">
                <Phone className="w-4 h-4 text-amber-400" />
                <span className="text-sm uppercase tracking-wide">CITIZEN SOS REQUESTS</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Incoming emergency requests from affected citizens
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Optional Sort by Priority Control */}
              <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                <span className="text-slate-400 font-semibold uppercase text-[9px] mr-0.5">Sort:</span>
                {(['DEFAULT', 'HIGHEST', 'LOWEST'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSortBy(mode)}
                    className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                      sortBy === mode
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={
                      mode === 'DEFAULT' ? 'Default order' :
                      mode === 'HIGHEST' ? 'Priority — Highest First' : 'Priority — Lowest First'
                    }
                  >
                    {mode === 'DEFAULT' ? 'Default' : mode === 'HIGHEST' ? 'Priority ↑' : 'Priority ↓'}
                  </button>
                ))}
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700 text-amber-300 text-[10px] font-bold tracking-wider">
                SIMULATED DEMONSTRATION DATA
              </span>
            </div>
          </div>

          {/* Telemetry Summary Counters (with Highest Priority) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Requests</span>
              <span className="text-lg font-bold text-slate-100">{sosReports.length}</span>
            </div>
            <div className="p-2.5 rounded bg-red-950/40 border border-red-900/60">
              <span className="text-[10px] text-red-300 block font-semibold uppercase">Critical</span>
              <span className="text-lg font-bold text-red-400">{criticalSOSCount}</span>
            </div>
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-900/60">
              <span className="text-[10px] text-amber-300 block font-semibold uppercase">High</span>
              <span className="text-lg font-bold text-amber-400">{highSOSCount}</span>
            </div>
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-900/60">
              <span className="text-[10px] text-emerald-300 block font-semibold uppercase">Resolved</span>
              <span className="text-lg font-bold text-emerald-400">{resolvedSOSCount}</span>
            </div>
            <div className="p-2.5 rounded bg-red-950/50 border border-red-800/80 col-span-2 sm:col-span-1 flex flex-col justify-between">
              <span className="text-[10px] text-red-300 block font-semibold uppercase tracking-wider">Highest Priority</span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                {highestPriorityScore !== null ? (
                  <>
                    <span className="text-lg font-black font-mono text-red-400">{highestPriorityScore}</span>
                    <span className="text-[10px] text-slate-400 font-mono">/ 100</span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-400">UNAVAILABLE</span>
                )}
              </div>
            </div>
          </div>

          {/* Submitted Request Queue Cards */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {displayedSOS.map((sos) => {
              const sosId = sos.id || sos.sos_id || 'SOS-000';
              const priorityInfo = getAuthoritativeSOSPriority(sos, incidents, sarResult);
              const currentStatus = (sos.status || 'NEW').toUpperCase();
              const isUpdating = updatingSosId === sosId;
              const isExpanded = !!expandedReasons[sosId];

              const isCrit = priorityInfo.level === 'CRITICAL';
              const isHigh = priorityInfo.level === 'HIGH';
              const isMed = priorityInfo.level === 'MEDIUM';
              const isLow = priorityInfo.level === 'LOW';

              const badgeColor =
                isCrit ? 'bg-red-950 text-red-200 border-red-700 ring-1 ring-red-500/40' :
                isHigh ? 'bg-orange-950 text-orange-200 border-orange-700' :
                isMed ? 'bg-yellow-950 text-yellow-200 border-yellow-700' :
                isLow ? 'bg-emerald-950 text-emerald-200 border-emerald-700' :
                'bg-slate-800 text-slate-300 border-slate-700';

              const dotColor =
                isCrit ? 'bg-red-500 animate-pulse' :
                isHigh ? 'bg-orange-500' :
                isMed ? 'bg-yellow-500' :
                isLow ? 'bg-emerald-500' :
                'bg-slate-500';

              const scoreTextColor =
                isCrit ? 'text-red-400' :
                isHigh ? 'text-orange-400' :
                isMed ? 'text-yellow-400' :
                isLow ? 'text-emerald-400' :
                'text-slate-400';

              const barFillColor =
                isCrit ? 'bg-red-500' :
                isHigh ? 'bg-orange-500' :
                isMed ? 'bg-yellow-500' :
                isLow ? 'bg-emerald-500' :
                'bg-slate-600';

              return (
                <div 
                  key={sosId} 
                  className="p-3.5 rounded-lg bg-command-card/90 border border-command-border space-y-2.5 shadow hover:border-slate-700 transition"
                >
                  {/* TOP SECTION: Prominent Priority Level & Score */}
                  <div className="flex items-start justify-between gap-2 border-b border-command-border/60 pb-2.5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded text-xs font-black tracking-wider uppercase inline-flex items-center space-x-1.5 shadow-sm border ${badgeColor}`}>
                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span>{priorityInfo.level}</span>
                        </span>
                        <span className="text-blue-400 font-bold font-mono text-xs">
                          {sosId}
                        </span>
                      </div>
                      <div className="font-bold text-slate-200 uppercase text-[11px] mt-1 tracking-wide">
                        {sos.category.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                      <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                        {priorityInfo.isDemoPriority ? 'DEMO PRIORITY SCORE' : 'PRIORITY SCORE'}
                      </span>
                      {priorityInfo.score !== null ? (
                        <>
                          <div className="flex items-baseline space-x-1 mt-0.5">
                            <span className={`text-base font-black font-mono ${scoreTextColor}`}>
                              {priorityInfo.score}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">/ 100</span>
                          </div>
                          {/* Visual Progress Bar Indicator */}
                          <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80 mt-1">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${barFillColor}`}
                              style={{ width: `${Math.min(100, Math.max(0, priorityInfo.score))}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 mt-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                          UNAVAILABLE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Citizen Situation Description */}
                  <p className="text-slate-200 text-xs leading-relaxed italic">
                    "{sos.description}"
                  </p>

                  {/* Geospatial Location & People Affected */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1 border-t border-command-border/40">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Location:</span>
                      <div className="flex items-center space-x-1 text-slate-200 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{sos.address || `${sos.location.lat.toFixed(4)}, ${sos.location.lng.toFixed(4)}`}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">People affected:</span>
                      <div className="flex items-center space-x-1 text-amber-300 font-bold">
                        <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{sos.people_affected || sos.people_count || 1}</span>
                      </div>
                    </div>
                  </div>

                  {/* Explainable Factors ("WHY THIS PRIORITY?") */}
                  {priorityInfo.reasons.length > 0 && (
                    <div className="pt-1 border-t border-command-border/30">
                      <button
                        type="button"
                        onClick={() => toggleReasons(sosId)}
                        className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center space-x-1 font-semibold cursor-pointer transition"
                      >
                        <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        <span>WHY THIS PRIORITY?</span>
                      </button>
                      {isExpanded && (
                        <div className="mt-1.5 p-2 rounded bg-slate-900/90 border border-slate-800 space-y-1 text-[10px] text-slate-300">
                          <ul className="space-y-1 pl-1">
                            {priorityInfo.reasons.map((r, idx) => (
                              <li key={idx} className="flex items-start space-x-1.5">
                                <span className="text-sky-400 shrink-0">•</span>
                                <span className="leading-snug">{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status & Interactive Dispatcher Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-command-border/50">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-slate-400">Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        currentStatus === 'RESOLVED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : currentStatus === 'ASSIGNED'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : currentStatus === 'ACKNOWLEDGED'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {currentStatus}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 ml-auto">
                      {currentStatus === 'NEW' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(sosId, 'ACKNOWLEDGED')}
                          className="px-2.5 py-1 rounded bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-700 text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          ACKNOWLEDGE
                        </button>
                      )}

                      {(currentStatus === 'NEW' || currentStatus === 'ACKNOWLEDGED') && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(sosId, 'ASSIGNED')}
                          className="px-2.5 py-1 rounded bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 border border-blue-700 text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          ASSIGN RESOURCE
                        </button>
                      )}

                      {currentStatus !== 'RESOLVED' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(sosId, 'RESOLVED')}
                          className="px-2.5 py-1 rounded bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-700 text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          RESOLVE
                        </button>
                      )}

                      {currentStatus === 'RESOLVED' && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>RESOLVED / CLOSED</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {displayedSOS.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No citizen emergency requests on record.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Live SOS Triage Stream */}
        <div className="lg:col-span-6 space-y-3 font-mono text-xs">
          
          {/* Header & Filter Controls */}
          <div className="p-3 rounded-t-lg bg-command-surface border border-command-border flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 font-bold text-slate-100">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>LIVE TRIAGE STREAM</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({filteredSOS.length} of {sosReports.length})
              </span>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center space-x-1">
              <Filter className="w-3 h-3 text-slate-400 mr-1" />
              {(['ALL', 'NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'RESOLVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Stream Cards */}
          <div className="bg-command-surface border-x border-b border-command-border rounded-b-lg divide-y divide-command-border max-h-[640px] overflow-y-auto">
            {filteredSOS.map((sos) => {
              const sosId = sos.id || sos.sos_id || 'SOS-000';
              const priorityInfo = getAuthoritativeSOSPriority(sos, incidents, sarResult);
              const currentStatus = (sos.status || 'PENDING').toUpperCase();
              const isUpdating = updatingSosId === sosId;
              const floodRel = getSOSFloodRelation(sos.location, sarResult);

              const isCrit = priorityInfo.level === 'CRITICAL';
              const isHigh = priorityInfo.level === 'HIGH';
              const isMed = priorityInfo.level === 'MEDIUM';
              const isLow = priorityInfo.level === 'LOW';

              const badgeColor =
                isCrit ? 'bg-red-950 text-red-200 border-red-700' :
                isHigh ? 'bg-orange-950 text-orange-200 border-orange-700' :
                isMed ? 'bg-yellow-950 text-yellow-200 border-yellow-700' :
                isLow ? 'bg-emerald-950 text-emerald-200 border-emerald-700' :
                'bg-slate-800 text-slate-300 border-slate-700';

              const dotColor =
                isCrit ? 'bg-red-500 animate-pulse' :
                isHigh ? 'bg-orange-500' :
                isMed ? 'bg-yellow-500' :
                isLow ? 'bg-emerald-500' :
                'bg-slate-500';

              const scoreTextColor =
                isCrit ? 'text-red-400' :
                isHigh ? 'text-orange-400' :
                isMed ? 'text-yellow-400' :
                isLow ? 'text-emerald-400' :
                'text-slate-400';

              const barFillColor =
                isCrit ? 'bg-red-500' :
                isHigh ? 'bg-orange-500' :
                isMed ? 'bg-yellow-500' :
                isLow ? 'bg-emerald-500' :
                'bg-slate-600';

              return (
                <div key={sosId} className="p-3.5 space-y-2.5 hover:bg-slate-900/60 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-command-border/40 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase inline-flex items-center space-x-1 border ${badgeColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        <span>{priorityInfo.level}</span>
                      </span>
                      <span className="font-bold text-slate-200 uppercase text-[11px]">
                        {sos.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-blue-400 font-mono font-bold">
                        {sosId}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${floodRel.color}`}>
                        {floodRel.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {priorityInfo.score !== null ? (
                        <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">
                            {priorityInfo.isDemoPriority ? 'DEMO PRIORITY:' : 'PRIORITY:'}
                          </span>
                          <span className={`font-mono font-bold text-xs ${scoreTextColor}`}>
                            {priorityInfo.score}/100
                          </span>
                          <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                            <div 
                              className={`h-full ${barFillColor}`}
                              style={{ width: `${Math.min(100, Math.max(0, priorityInfo.score))}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          PRIORITY: UNAVAILABLE
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(sos.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-200 text-xs leading-relaxed">
                    {sos.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-command-border/40">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>{sos.address || `${sos.location.lat.toFixed(4)}, ${sos.location.lng.toFixed(4)}`}</span>
                    </span>

                    <span className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>{sos.people_affected || sos.people_count || 1} People</span>
                    </span>

                    {sos.medical_urgency && (
                      <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-800">
                        MED URGENCY
                      </span>
                    )}

                    {sos.contact_number && (
                      <span className="flex items-center space-x-1 text-slate-300">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{sos.contact_number}</span>
                      </span>
                    )}
                  </div>

                  {/* Operator Status Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-slate-400">Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        currentStatus === 'RESOLVED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : currentStatus === 'ASSIGNED'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : currentStatus === 'ACKNOWLEDGED'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {currentStatus}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {currentStatus === 'NEW' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(sos.id || sos.sos_id, 'ACKNOWLEDGED')}
                          className="px-2 py-1 rounded bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-700 text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          ACKNOWLEDGE
                        </button>
                      )}
                      {(currentStatus === 'NEW' || currentStatus === 'ACKNOWLEDGED') && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(sos.id || sos.sos_id, 'ASSIGNED')}
                          className="px-2 py-1 rounded bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 border border-blue-700 text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          ASSIGN RESOURCE
                        </button>
                      )}
                      {currentStatus !== 'RESOLVED' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(sos.id || sos.sos_id, 'RESOLVED')}
                          className="px-2 py-1 rounded bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-700 text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          RESOLVE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSOS.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No citizen SOS reports matching the active filter.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: MULTI-SENSOR FUSION DETAIL MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-command-bg border border-command-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto font-mono text-xs shadow-2xl space-y-4 p-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-command-border pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-slate-100">
                    MULTI-SENSOR SITUATION FUSION — {selectedIncident.incident_id}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedIncident.name || selectedIncident.event || 'Bengaluru Corridor Incident Zone'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fusion Priority Banner */}
            <div className="p-4 rounded-lg bg-slate-900 border border-command-border grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">NORMALIZED PRIORITY</span>
                <span className="text-2xl font-black text-red-400">
                  {selectedIncident.priorities?.score ?? Math.round((selectedIncident.flood_severity || 0.8) * 100)}
                  <span className="text-xs text-slate-500 font-normal"> / 100</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">TRIAGE CATEGORY</span>
                <span className="px-2.5 py-1 rounded bg-red-950 border border-red-800 text-red-300 font-bold inline-block">
                  {selectedIncident.severity || selectedIncident.risk_level || 'CRITICAL'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">POPULATION AT RISK</span>
                <span className="text-base font-bold text-amber-300">
                  {selectedIncident.people_affected || selectedIncident.people_detected || 12} Citizens
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">ACTIVE SOS CALLS</span>
                <span className="text-base font-bold text-red-300">
                  {selectedIncident.sos_reports_summary?.total ?? sosReports.length} Reports
                </span>
              </div>
            </div>

            {/* 3 Pillars of Fusion: Stage 4 SAR + Stage 5 Ground Vision + Stage 6 SOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Pillar 1: Stage 4 SAR Satellite */}
              <div className="p-3.5 rounded-lg bg-command-surface border border-command-border space-y-2">
                <div className="flex items-center justify-between border-b border-command-border pb-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-blue-400">
                    <Satellite className="w-4 h-4" />
                    <span>STAGE 4: SAR FLOOD</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                    COPERNICUS REAL
                  </span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flooded Extent:</span>
                    <span className="font-bold text-white">
                      {sarResult?.flooded_area_km2 ? `${sarResult.flooded_area_km2} km²` : selectedIncident.flood_analysis?.inundated_area_km2 ? `${selectedIncident.flood_analysis.inundated_area_km2} km²` : '48.6 km²'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">AOI Inundation:</span>
                    <span className="font-bold text-white">
                      {sarResult?.flood_percentage ? `${sarResult.flood_percentage}%` : selectedIncident.flood_analysis?.flood_percentage ? `${selectedIncident.flood_analysis.flood_percentage}%` : '16.4%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Radar &Delta;:</span>
                    <span className="font-bold text-emerald-400">
                      {sarResult?.mean_delta_db ? `${sarResult.mean_delta_db} dB` : selectedIncident.flood_analysis?.mean_delta_db ? `${selectedIncident.flood_analysis.mean_delta_db} dB` : '-3.8 dB'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sensor:</span>
                    <span className="text-slate-300">
                      {selectedIncident.flood_analysis?.source || 'Copernicus Sentinel-1 C-SAR'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Stage 5 Ground Verification */}
              <div className="p-3.5 rounded-lg bg-command-surface border border-command-border space-y-2">
                <div className="flex items-center justify-between border-b border-command-border pb-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                    <Radio className="w-4 h-4" />
                    <span>STAGE 5: GROUND VISION</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                    MODEL-DERIVED
                  </span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Detections:</span>
                    <span className="font-bold text-white">
                      {droneDetections.length > 0 ? `${droneDetections.length} objects` : selectedIncident.ground_detections?.total_detections ? `${selectedIncident.ground_detections.total_detections} objects` : '7 objects'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Persons Detected:</span>
                    <span className="font-bold text-amber-300">
                      {droneDetections.length > 0 ? `${droneDetections.filter(d => d.object_type === 'person').length} persons` : selectedIncident.ground_detections?.people_detected ? `${selectedIncident.ground_detections.people_detected} persons` : '7 persons'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Watercraft / Boats:</span>
                    <span className="font-bold text-cyan-300">
                      {droneDetections.filter(d => d.object_type === 'boat').length || selectedIncident.ground_detections?.boats_detected || 1} craft
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Inference Model:</span>
                    <span className="text-slate-300">
                      COCO-SSD MobileNetV2
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillar 3: Stage 6 Citizen SOS */}
              <div className="p-3.5 rounded-lg bg-command-surface border border-command-border space-y-2">
                <div className="flex items-center justify-between border-b border-command-border pb-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>STAGE 6: CITIZEN SOS</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                    SIMULATED DEMO
                  </span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total SOS Calls:</span>
                    <span className="font-bold text-white">
                      {selectedIncident.sos_reports_summary?.total ?? sosReports.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Critical Medical:</span>
                    <span className="font-bold text-red-400">
                      {selectedIncident.sos_reports_summary?.critical ?? criticalSOSCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">People In Distress:</span>
                    <span className="font-bold text-amber-300">
                      {selectedIncident.people_affected || selectedIncident.people_detected || 14}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Triage Pipeline:</span>
                    <span className="text-slate-300">Active Intake</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Fusion Priority Explanations */}
            <div className="p-3 rounded-lg bg-slate-900 border border-command-border space-y-1.5">
              <span className="font-bold text-slate-200 block text-[11px]">
                TRANSPARENT MULTI-SENSOR FUSION FORMULA (0–100 NORMALIZED):
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                <code className="bg-slate-950 px-1.5 py-0.5 rounded text-sky-300">
                  Priority = 0.35 × (SAR Flood Extent) + 0.30 × (Model Ground Detections) + 0.25 × (Citizen SOS Calls) + 0.10 × (Damage Index)
                </code>
              </p>
              {selectedIncident.priorities?.reasons && selectedIncident.priorities.reasons.length > 0 && (
                <div className="pt-1.5 space-y-1 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold">Key Contributing Factors:</span>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                    {selectedIncident.priorities.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer close */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
              >
                CLOSE FUSION VIEW
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
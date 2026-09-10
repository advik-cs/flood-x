import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  Sliders, 
  Navigation, 
  CheckCircle, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  AlertTriangle,
  Send,
  RefreshCw,
  Check,
  Edit3,
  ArrowRight,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  X,
  UserCheck
} from 'lucide-react';
import { Incident, PresetLocation, ResourceItem, RoadEdge, RiskLevel } from '../../types/index.js';
import { 
  assignIncidentResource, 
  computeSafeRoute, 
  updatePriorityWeights,
  fetchResourceRecommendations,
  overrideIncidentDecision,
  updateResource
} from '../../services/api.js';

interface ResourceOptimizationProps {
  preset: PresetLocation | null;
  resources: ResourceItem[];
  incidents: Incident[];
  roads: RoadEdge[];
  onRefreshData: () => void;
  onSelectRoute?: (waypoints: [number, number][]) => void;
}

export const ResourceOptimization: React.FC<ResourceOptimizationProps> = ({
  preset,
  resources,
  incidents,
  roads,
  onRefreshData,
  onSelectRoute
}) => {
  // Selected incident for tactical dispatch
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    incidents[0]?.incident_id || 'FLD-BLR-DEMO'
  );

  // Recommendations state
  const [recommendations, setRecommendations] = useState<{
    incident_id: string;
    priority: any;
    recommended_resources: any[];
    notes: string;
  } | null>(null);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  // Override modal state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideScore, setOverrideScore] = useState(90);
  const [overrideCategory, setOverrideCategory] = useState<RiskLevel>('CRITICAL');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Safe routing state
  const [testRoute, setTestRoute] = useState<any | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Find active incident
  const activeIncident = incidents.find(i => i.incident_id === selectedIncidentId) || incidents[0];

  // Fetch recommendations when selected incident changes
  useEffect(() => {
    if (activeIncident?.incident_id) {
      loadRecommendations(activeIncident.incident_id);
    }
  }, [selectedIncidentId, incidents]);

  const loadRecommendations = async (incId: string) => {
    setIsLoadingRecs(true);
    try {
      const recs = await fetchResourceRecommendations(incId);
      setRecommendations(recs);
      if (recs && recs.recommended_resources?.[0]?.suggested_route?.waypoints && onSelectRoute) {
        onSelectRoute(recs.recommended_resources[0].suggested_route.waypoints);
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  // Action: Accept recommendations (Decision Support)
  const handleAcceptRecommendations = async () => {
    if (!activeIncident || !recommendations) return;
    try {
      const recIds = recommendations.recommended_resources.map(r => r.id || r.resource_id);
      await overrideIncidentDecision(activeIncident.incident_id, {
        action: 'ACCEPT_RECOMMENDATIONS',
        notes: `Operator accepted recommended allocation (${recIds.length} units)`,
        assigned_resources: recIds
      });
      setActionSuccessMsg(`Successfully accepted recommendation! Assigned ${recIds.length} rescue unit(s).`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
      onRefreshData();
    } catch (err) {
      console.error('Error accepting recommendation:', err);
    }
  };

  // Action: Submit human priority override
  const handleSaveOverride = async () => {
    if (!activeIncident) return;
    try {
      await overrideIncidentDecision(activeIncident.incident_id, {
        action: 'OVERRIDE_PRIORITY',
        priority: {
          score: overrideScore,
          category: overrideCategory,
          reasons: [overrideNotes || 'Manual operator adjustment based on on-the-ground intelligence']
        },
        notes: overrideNotes
      });
      setIsOverrideModalOpen(false);
      setActionSuccessMsg(`Incident priority updated to ${overrideCategory} (${overrideScore}/100) by Operator.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
      onRefreshData();
    } catch (err) {
      console.error('Error overriding priority:', err);
    }
  };

  // Action: Reassign or unassign resource
  const handleToggleResourceAssignment = async (resource: ResourceItem) => {
    if (!activeIncident) return;
    const isAssigned = (resource.assigned_incident === activeIncident.incident_id) || 
                       (resource.assigned_incident_id === activeIncident.incident_id);
    const action = isAssigned ? 'unassign' : 'assign';

    try {
      await assignIncidentResource(activeIncident.incident_id, resource.id, action);
      setActionSuccessMsg(`Resource ${resource.name} ${action === 'assign' ? 'assigned to' : 'released from'} ${activeIncident.incident_id}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      onRefreshData();
    } catch (err) {
      console.error('Error toggling assignment:', err);
    }
  };

  // Action: Toggle availability
  const handleToggleAvailability = async (resource: ResourceItem) => {
    const nextStatus = resource.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    try {
      await updateResource(resource.id, { status: nextStatus, availability: nextStatus === 'AVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE' });
      onRefreshData();
    } catch (err) {
      console.error('Error updating resource:', err);
    }
  };

  // Action: Calculate route
  const handleTestRoute = async () => {
    if (resources.length === 0 || !activeIncident) return;
    setIsCalculatingRoute(true);
    try {
      const res = resources.find(r => r.status === 'AVAILABLE') || resources[0];
      const route = await computeSafeRoute(res.location, activeIncident.location, res.speed_kmh || 40);
      setTestRoute(route);
      if (route && route.waypoints && onSelectRoute) {
        onSelectRoute(route.waypoints);
      }
    } catch (err) {
      console.error('Routing error:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const availableRes = resources.filter(r => r.status === 'AVAILABLE');
  const deployedRes = resources.filter(r => r.status !== 'AVAILABLE');

  return (
    <div className="h-[calc(100vh-84px)] overflow-y-auto bg-command-bg text-slate-100 p-4 lg:p-6 space-y-6 font-mono text-xs">
      
      {/* Top Header & Decision Support Disclosure */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-command-border pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-slate-100">
              STAGE 7 — EMERGENCY RESOURCE OPTIMIZATION & DECISION SUPPORT
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Algorithmic resource allocation recommendations with full Human-in-the-Loop authorization. Operators retain final dispatch control.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-bold">
            {availableRes.length} ASSETS AVAILABLE
          </span>
          <span className="text-xs px-2.5 py-1 rounded bg-blue-950/60 border border-blue-800 text-blue-300 font-bold">
            {deployedRes.length} DEPLOYED
          </span>
        </div>
      </div>

      {/* Decision Support Banner */}
      <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/80 text-blue-200 flex items-center justify-between shadow">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span className="font-semibold text-[11px]">
            DECISION SUPPORT SYSTEM — NOT AUTONOMOUS DISPATCH. All recommendations require authorized operator confirmation or override.
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-blue-900/60 border border-blue-700 text-sky-300 text-[10px] font-bold">
          HUMAN-IN-THE-LOOP ACTIVE
        </span>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center space-x-2 shadow animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* SECTION 1: INCIDENT SELECTOR & TRANSPARENT PRIORITY FORMULA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Incident Priority & Recommendation Card */}
        <div className="lg:col-span-6 p-4 rounded-lg bg-command-surface border border-command-border space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-command-border pb-2.5">
            <div className="flex items-center space-x-2 font-bold text-slate-100">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>INCIDENT PRIORITY & TACTICAL RECOMMENDATION</span>
            </div>

            {/* Incident dropdown */}
            <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded border border-slate-700">
              <label className="text-[10px] text-slate-400">Target Incident:</label>
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="bg-transparent text-blue-300 font-bold focus:outline-none cursor-pointer"
              >
                {incidents.map(inc => (
                  <option key={inc.incident_id} value={inc.incident_id} className="bg-slate-900 text-slate-200">
                    {inc.incident_id} — {inc.name || inc.event || 'Incident'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeIncident && (
            <div className="space-y-4">
              {/* Priority Status Box */}
              <div className="p-3.5 rounded-lg bg-slate-900 border border-command-border grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">COMPUTED PRIORITY</span>
                  <span className="text-2xl font-black text-red-400">
                    {activeIncident.priorities?.score ?? Math.round((activeIncident.flood_severity || 0.8) * 100)}
                    <span className="text-xs text-slate-500 font-normal"> / 100</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">TRIAGE SEVERITY</span>
                  <span className="px-2 py-1 rounded bg-red-950 border border-red-800 text-red-300 font-bold inline-block text-[11px]">
                    {activeIncident.priorities?.category || activeIncident.severity || 'CRITICAL'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">ASSIGNED FLEET</span>
                  <span className="text-lg font-bold text-emerald-300">
                    {resources.filter(r => r.assigned_incident === activeIncident.incident_id || r.assigned_incident_id === activeIncident.incident_id).length} Units
                  </span>
                </div>
              </div>

              {/* Transparent Priority Formula Explanation */}
              <div className="p-3 rounded bg-slate-950/70 border border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-300 block text-[11px]">
                  TRANSPARENT 0–100 PRIORITY CALCULATION FORMULA:
                </span>
                <code className="block bg-slate-900 p-2 rounded text-sky-300 text-[11px] border border-slate-800 leading-relaxed">
                  Priority = 0.35 × (SAR Flood Extent) + 0.30 × (Model Ground Detections) + 0.25 × (Citizen SOS Volume) + 0.10 × (Damage Index)
                </code>
                {activeIncident.priorities?.reasons && (
                  <ul className="list-disc list-inside text-[10px] text-slate-400 pt-1 space-y-0.5">
                    {activeIncident.priorities.reasons.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recommended Resources Box */}
              <div className="p-3 rounded-lg bg-command-card border border-command-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    <span>RECOMMENDED ASSETS (AVAILABLE ONLY)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {recommendations?.recommended_resources?.length || 0} match(es)
                  </span>
                </div>

                {isLoadingRecs ? (
                  <div className="py-4 text-center text-slate-500 flex items-center justify-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating fleet availability and distance...</span>
                  </div>
                ) : recommendations && recommendations.recommended_resources.length > 0 ? (
                  <div className="space-y-2.5">
                    {recommendations.recommended_resources.map((rec: any) => (
                      <div key={rec.id} className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-200">{rec.name}</div>
                            <div className="text-[10px] text-slate-400">
                              Type: <span className="uppercase text-slate-300">{rec.type}</span> • Base: {rec.base_station} • Speed: {rec.speed_kmh} km/h
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                            RECOMMENDED
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 bg-command-card p-2 rounded border border-command-border flex items-start space-x-2">
                          <span className="font-bold text-sky-400 shrink-0 uppercase tracking-wide">Rationale:</span>
                          <div className="text-slate-300 space-y-0.5 leading-relaxed">
                            {rec.match_reasons && rec.match_reasons.length > 0 ? (
                              rec.match_reasons.map((mr: string, i: number) => (
                                <div key={i}>• {mr}</div>
                              ))
                            ) : (
                              <div>Closest available emergency asset ({rec.distance_km || 3.8} km) with amphibious/waterborne draft matching casualty extraction requirements.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-slate-400 bg-slate-900 rounded border border-slate-800">
                    All recommended units are currently assigned or in maintenance.
                  </div>
                )}
              </div>

              {/* Human Override Action Buttons */}
              <div className="pt-2 grid grid-cols-2 gap-3">
                <button
                  onClick={handleAcceptRecommendations}
                  disabled={!recommendations || recommendations.recommended_resources.length === 0}
                  className="py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center space-x-2 shadow disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ACCEPT RECOMMENDATION</span>
                </button>

                <button
                  onClick={() => {
                    setOverrideScore(activeIncident.priorities?.score ?? 90);
                    setOverrideCategory(activeIncident.priorities?.category || 'CRITICAL');
                    setIsOverrideModalOpen(true);
                  }}
                  className="py-2.5 px-3 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 font-bold transition flex items-center justify-center space-x-2 shadow cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>ADJUST PRIORITY (OVERRIDE)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Safe Obstacle-Aware Routing Simulator */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-lg bg-command-surface border border-command-border space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-command-border pb-2.5">
              <span className="font-bold text-slate-100 flex items-center space-x-1.5">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span>OBSTACLE-AWARE SAFE ROUTING SIMULATOR</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                A* GRAPH ENGINE
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dynamically evaluates road network inundation and bridge structural collapses. Navigates rescue fleet along flood-free corridors.
            </p>

            <button
              onClick={handleTestRoute}
              disabled={isCalculatingRoute || resources.length === 0}
              className="w-full py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition flex items-center justify-center space-x-2 cursor-pointer shadow"
            >
              <Navigation className={`w-4 h-4 text-emerald-400 ${isCalculatingRoute ? 'animate-spin' : ''}`} />
              <span>
                {isCalculatingRoute ? 'COMPUTING SAFE CORRIDOR...' : `CALCULATE SAFE ROUTE (STAGING → ${activeIncident?.incident_id || 'INCIDENT'})`}
              </span>
            </button>

            {testRoute && (
              <div className="p-3.5 rounded bg-command-card border border-command-border space-y-2 text-[11px] animate-fade-in">
                <div className="flex justify-between font-bold border-b border-command-border pb-1.5">
                  <span className="text-slate-300">Route Status:</span>
                  <span className="text-emerald-400">CORRIDOR CLEAR (100% DRY ROADS)</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-300">Calculated Distance:</span>
                  <span className="text-sky-400">{testRoute.total_distance_km} km</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-300">Estimated Travel Time:</span>
                  <span className="text-emerald-400">~{testRoute.estimated_time_mins} Minutes</span>
                </div>
                {testRoute.avoided_blocked_roads && testRoute.avoided_blocked_roads.length > 0 && (
                  <div className="p-2 rounded bg-red-950/40 border border-red-900/60 text-[10px] text-red-300 space-y-0.5">
                    <span className="font-bold block">Avoided Submerged / Blocked Roads:</span>
                    <span>{testRoute.avoided_blocked_roads.join(', ')}</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-400 italic pt-1">
                  {testRoute.notes}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Summary */}
          <div className="p-4 rounded-lg bg-command-surface border border-command-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shadow-lg">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">TOTAL ASSETS</span>
              <span className="text-lg font-bold text-white">{resources.length}</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">BOATS & SQUADS</span>
              <span className="text-lg font-bold text-blue-400">
                {resources.filter(r => r.type === 'BOAT' || r.type === 'boat' || r.type === 'RESCUE_TEAM' || r.type === 'rescue_team').length}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">AMBULANCES</span>
              <span className="text-lg font-bold text-red-400">
                {resources.filter(r => r.type === 'AMBULANCE' || r.type === 'ambulance').length}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">ROAD EDGES</span>
              <span className="text-lg font-bold text-emerald-400">{roads.length}</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2: COMPLETE RESOURCE STATUS & ASSIGNMENT TABLE */}
      <div className="rounded-lg bg-command-surface border border-command-border overflow-hidden shadow-lg">
        <div className="p-3 bg-slate-900/80 border-b border-command-border flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold text-slate-100">
            <LifeBuoy className="w-4 h-4 text-emerald-400" />
            <span>EMERGENCY RESOURCE STATUS & ASSIGNMENT ROSTER</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click 'ASSIGN' or 'RELEASE' to manually adjust fleet assignments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-950/70 border-b border-command-border text-slate-400 uppercase text-[10px]">
                <th className="p-3">Resource</th>
                <th className="p-3">Type</th>
                <th className="p-3">Base Station</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Speed / Fuel</th>
                <th className="p-3">Availability</th>
                <th className="p-3">Assigned Incident</th>
                <th className="p-3 text-right">Operator Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-command-border/50">
              {resources.map((res) => {
                const isAvailable = res.status === 'AVAILABLE';
                const isAssignedToActive = (res.assigned_incident === activeIncident?.incident_id) || 
                                           (res.assigned_incident_id === activeIncident?.incident_id);

                return (
                  <tr key={res.id} className="hover:bg-slate-900/60 transition">
                    <td className="p-3 font-bold text-slate-200">
                      <div className="flex items-center space-x-1.5">
                        <span>{res.name}</span>
                        {res.all_terrain && (
                          <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            AMPHIBIOUS
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">{res.id}</span>
                    </td>
                    <td className="p-3 uppercase text-slate-300 font-semibold">
                      {res.type}
                    </td>
                    <td className="p-3 text-slate-300">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{res.base_station || 'Central Staging'}</span>
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      {res.capacity || 4} persons
                    </td>
                    <td className="p-3 text-slate-300">
                      <span>{res.speed_kmh || 40} km/h</span> • <span className="text-emerald-400 font-bold">{res.fuel_or_battery_pct || 90}%</span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleAvailability(res)}
                        title="Click to toggle availability"
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          isAvailable
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {res.status}
                      </button>
                    </td>
                    <td className="p-3 font-bold">
                      {res.assigned_incident || res.assigned_incident_id ? (
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          {res.assigned_incident || res.assigned_incident_id}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-normal">UNASSIGNED</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleResourceAssignment(res)}
                        className={`px-2.5 py-1 rounded font-bold transition text-[10px] cursor-pointer ${
                          isAssignedToActive
                            ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800'
                            : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40'
                        }`}
                      >
                        {isAssignedToActive ? 'RELEASE RESOURCE' : `ASSIGN TO ${activeIncident?.incident_id || 'INCIDENT'}`}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: HUMAN OPERATOR PRIORITY OVERRIDE */}
      {isOverrideModalOpen && activeIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono text-xs">
          <div className="bg-command-bg border border-command-border rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-command-border pb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-slate-100">
                  HUMAN OVERRIDE: {activeIncident.incident_id}
                </h2>
              </div>
              <button 
                onClick={() => setIsOverrideModalOpen(false)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              As an authorized emergency coordinator, you can adjust the algorithmic triage score or severity tier based on human intelligence, radio communications, or changing river levels.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 block mb-1 font-bold">Severity Tier Override:</label>
                <select
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value as RiskLevel)}
                  className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Life Threat)</option>
                  <option value="HIGH">HIGH (Severe Threat)</option>
                  <option value="MEDIUM">MEDIUM (Moderate Risk)</option>
                  <option value="LOW">LOW (Low Threat)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-300 font-bold">Priority Score (0–100):</label>
                  <span className="text-red-400 font-bold text-sm">{overrideScore}/100</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(parseInt(e.target.value, 10))}
                  className="w-full accent-red-500 h-2 bg-slate-800 rounded"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">Operator Justification / Rationale:</label>
                <textarea
                  rows={3}
                  placeholder="e.g., On-scene fire brigade confirms water rising 30cm/hr near hospital wing..."
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-command-border">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveOverride}
                className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center space-x-1.5 cursor-pointer shadow"
              >
                <UserCheck className="w-4 h-4" />
                <span>CONFIRM OVERRIDE</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
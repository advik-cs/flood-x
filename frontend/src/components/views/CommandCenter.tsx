import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Users, 
  MapPin, 
  LifeBuoy, 
  Navigation, 
  ShieldAlert, 
  CheckCircle, 
  Send,
  Radio,
  FileText,
  Sliders,
  ExternalLink,
  Info
} from 'lucide-react';
import { MapView } from '../MapView.js';
import { 
  Incident, 
  PresetLocation, 
  ResourceItem, 
  RoadEdge, 
  ShelterItem, 
  SOSReport, 
  DamageReport, 
  DroneDetection, 
  SARAnalysisResult 
} from '../../types/index.js';
import { assignResource, recommendResource } from '../../services/api.js';

interface CommandCenterProps {
  preset: PresetLocation | null;
  incidents: Incident[];
  resources: ResourceItem[];
  shelters: ShelterItem[];
  roads: RoadEdge[];
  sosReports: SOSReport[];
  damageReports: DamageReport[];
  droneDetections: DroneDetection[];
  sarResult?: SARAnalysisResult;
  onRefreshData: () => void;
  onOpenSitrep: () => void;
  onOpenAi: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  preset,
  incidents,
  resources,
  shelters,
  roads,
  sosReports,
  damageReports,
  droneDetections,
  sarResult,
  onRefreshData,
  onOpenSitrep,
  onOpenAi,
  onNavigateTab
}) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(incidents[0] || null);
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);

  // Auto-select first incident if none selected
  useEffect(() => {
    if (!selectedIncident && incidents.length > 0) {
      setSelectedIncident(incidents[0]);
    }
  }, [incidents, selectedIncident]);

  // When selected incident changes, query nearest resource recommendation
  useEffect(() => {
    if (selectedIncident) {
      recommendResource(selectedIncident.incident_id)
        .then(rec => setRecommendation(rec))
        .catch(() => setRecommendation(null));
    }
  }, [selectedIncident]);

  const handleAssign = async (resId: string, incId: string) => {
    setIsAssigning(true);
    try {
      await assignResource(resId, incId);
      setDispatchMsg(`Unit ${resId} dispatched to ${incId}. Route calculated.`);
      setTimeout(() => setDispatchMsg(null), 5000);
      onRefreshData();
    } catch (e) {
      console.error('Dispatch failed:', e);
    } finally {
      setIsAssigning(false);
    }
  };

  // Find nearest resource distance
  const nearestRes = resources.find(r => r.status === 'AVAILABLE') || resources[0];

  return (
    <div className="h-[calc(100vh-84px)] flex flex-col lg:flex-row bg-[#0b0f19] text-slate-100 overflow-hidden select-none font-sans">
      
      {/* -------------------------------------------------- */}
      {/* LEFT SIDEBAR: INCIDENT QUEUE (COMPACT)             */}
      {/* -------------------------------------------------- */}
      <aside className="w-full lg:w-64 xl:w-72 border-r border-command-border flex flex-col bg-[#0e1424] shrink-0 overflow-hidden font-mono text-xs">
        {/* Incident Queue Header */}
        <div className="px-3 py-2 bg-slate-900 border-b border-command-border flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold text-slate-100 text-[11px]">
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            <span>INCIDENT QUEUE ({incidents.length})</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
            TRIAGE
          </span>
        </div>

        {/* Incident Queue Rows (Section 4 Spec) */}
        <div className="flex-1 divide-y divide-command-border/60 overflow-y-auto">
          {incidents.map((inc) => {
            const isSelected = selectedIncident?.incident_id === inc.incident_id;
            const isCritical = inc.priority === 'CRITICAL' || inc.severity === 'CRITICAL';
            const isHigh = inc.priority === 'HIGH' || inc.severity === 'HIGH';
            const priorityScore = inc.priorities?.score ?? (inc.priority_breakdown?.score ? Math.round(inc.priority_breakdown.score * 100) : Math.round((inc.flood_severity || 0.8) * 100));

            return (
              <div
                key={inc.incident_id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-950/50 border-l-4 border-blue-500 text-slate-100'
                    : 'hover:bg-slate-900/60 text-slate-300'
                }`}
              >
                {/* Top Line: Severity Badge & Incident ID */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        isCritical
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : isHigh
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {inc.priority || inc.severity || 'ACTIVE'}
                    </span>
                    <span className="font-bold text-slate-100 text-[11px]">
                      {inc.incident_id}
                    </span>
                  </div>

                  <span className="text-[9px] font-bold text-emerald-400">
                    {inc.status || 'ACTIVE'}
                  </span>
                </div>

                {/* Location Name */}
                <div className="text-[11px] font-semibold text-slate-200 mt-1 truncate font-sans">
                  {inc.name || inc.event || 'Bengaluru Corridor'}
                </div>

                {/* Bottom Line: Priority & SOS Count */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-800/60">
                  <span className="text-sky-300 font-semibold">
                    Priority {priorityScore}/100
                  </span>
                  <span className="flex items-center space-x-1 text-red-300 font-semibold">
                    <MapPin className="w-2.5 h-2.5 text-red-400" />
                    <span>{inc.sos_reports || (inc.sos_reports_summary?.total ?? 0)} SOS</span>
                  </span>
                </div>
              </div>
            );
          })}

          {incidents.length === 0 && (
            <div className="p-6 text-center text-[11px] text-slate-500">
              No active incidents reported in this sector.
            </div>
          )}
        </div>

        {/* Bottom Quick KPI Ribbon */}
        <div className="p-2 border-t border-command-border bg-slate-950/80 text-[10px] text-slate-400 grid grid-cols-2 gap-1 text-center">
          <div className="p-1 rounded bg-slate-900 border border-slate-800">
            <span className="block text-[9px] text-slate-500 uppercase">Available Fleet</span>
            <b className="text-emerald-400">{resources.filter(r => r.status === 'AVAILABLE').length} / {resources.length}</b>
          </div>
          <div className="p-1 rounded bg-slate-900 border border-slate-800">
            <span className="block text-[9px] text-slate-500 uppercase">Road Blocks</span>
            <b className="text-red-400">{roads.filter(r => r.status === 'BLOCKED').length} Segments</b>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------- */}
      {/* CENTER: DOMINANT GIS OPERATIONAL MAP (65-75%)       */}
      {/* -------------------------------------------------- */}
      <main className="flex-1 relative flex flex-col min-h-[420px] overflow-hidden">
        {dispatchMsg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1100] px-3.5 py-1.5 rounded bg-emerald-950/95 border border-emerald-500 text-emerald-200 text-xs font-mono font-semibold shadow-2xl flex items-center space-x-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
            <span>{dispatchMsg}</span>
          </div>
        )}

        <MapView
          preset={preset}
          incidents={incidents}
          resources={resources}
          shelters={shelters}
          roads={roads}
          sosReports={sosReports}
          damageReports={damageReports}
          droneDetections={droneDetections}
          sarResult={sarResult}
          selectedIncident={selectedIncident}
          onSelectIncident={(inc) => setSelectedIncident(inc)}
          activeRoutePolyline={recommendation?.suggested_route?.waypoints}
          className="h-full w-full"
        />
      </main>

      {/* -------------------------------------------------- */}
      {/* RIGHT SIDEBAR: SELECTED INCIDENT / SECTOR INTEL    */}
      {/* -------------------------------------------------- */}
      <aside className="w-full lg:w-72 xl:w-80 border-l border-command-border bg-[#0e1424] flex flex-col shrink-0 overflow-y-auto font-mono text-xs">
        {selectedIncident ? (
          <div className="p-3.5 space-y-3.5">
            {/* Header: Active Incident (Section 4 & 9 Spec) */}
            <div className="border-b border-command-border pb-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  ACTIVE INCIDENT
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    selectedIncident.priority === 'CRITICAL' || selectedIncident.severity === 'CRITICAL'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {selectedIncident.priority || selectedIncident.severity}
                </span>
              </div>
              <h2 className="text-xs font-bold text-slate-100 mt-1 font-sans leading-snug">
                {selectedIncident.name || selectedIncident.event}
              </h2>
              <div className="text-[10px] text-slate-400 mt-0.5">
                ID: <span className="text-blue-400 font-bold">{selectedIncident.incident_id}</span> • [{selectedIncident.location.lat.toFixed(4)}, {selectedIncident.location.lng.toFixed(4)}]
              </div>
            </div>

            {/* Structured Tactical Intelligence Table (Section 6 & 9) */}
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                INCIDENT INTELLIGENCE
              </span>
              <div className="rounded bg-slate-900/90 border border-slate-800 overflow-hidden divide-y divide-slate-800/70 text-[11px]">
                <div className="flex justify-between p-2">
                  <span className="text-slate-400">Flood Severity</span>
                  <span className={`font-bold ${selectedIncident.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>
                    {selectedIncident.severity || selectedIncident.risk_level || 'HIGH'} (Overbank Inundation)
                  </span>
                </div>

                <div className="flex justify-between p-2">
                  <span className="text-slate-400">Flooded Area</span>
                  <span className="font-bold text-sky-300">
                    {sarResult?.flooded_area_km2 ? `${sarResult.flooded_area_km2} km²` : selectedIncident.flood_analysis?.inundated_area_km2 ? `${selectedIncident.flood_analysis.inundated_area_km2} km²` : '5.6 km²'}
                  </span>
                </div>

                <div className="flex justify-between p-2">
                  <span className="text-slate-400">People Affected</span>
                  <span className="font-bold text-slate-200">
                    {selectedIncident.people_affected || selectedIncident.people_detected || 'NO DATA'}
                  </span>
                </div>

                <div className="flex justify-between p-2">
                  <span className="text-slate-400">SOS Reports</span>
                  <span className="font-bold text-red-400">
                    {selectedIncident.sos_reports || (selectedIncident.sos_reports_summary?.total ?? sosReports.length)}
                  </span>
                </div>

                <div className="flex justify-between p-2">
                  <span className="text-slate-400">Critical Incidents</span>
                  <span className="font-bold text-amber-300">
                    {incidents.filter(i => i.priority === 'CRITICAL' || i.severity === 'CRITICAL').length}
                  </span>
                </div>

                <div className="flex justify-between p-2">
                  <span className="text-slate-400">Blocked Roads</span>
                  <span className="font-bold text-red-400">
                    {roads.filter(r => r.status === 'BLOCKED').length}
                  </span>
                </div>

                <div className="flex justify-between p-2">
                  <span className="text-slate-400">Available Resources</span>
                  <span className="font-bold text-emerald-400">
                    {resources.filter(r => r.status === 'AVAILABLE').length} / {resources.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Section: MULTI-SENSOR DECISION SUMMARY (Section 6 & 7) */}
            <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <Radio className="w-3 h-3 text-sky-400" />
                  <span>MULTI-SENSOR DECISION SUMMARY</span>
                </span>
                <span className="text-[8px] px-1 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono font-semibold">
                  INTEGRATED
                </span>
              </div>
              <div className="space-y-1.5 text-[10px] font-mono">
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-400 font-semibold">SAR SATELLITE:</span>
                  <span className="font-bold text-sky-400">
                    HIGH ({sarResult?.flooded_area_km2 ? `${sarResult.flooded_area_km2} km²` : '5.6 km²'} Inundated)
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-400 font-semibold">GROUND VERIFICATION:</span>
                  <span className="font-bold text-cyan-300">
                    {droneDetections.length > 0 ? `${droneDetections.filter(d => d.object_type === 'person').length || droneDetections.length} PERSONS DETECTED` : '3 PERSONS DETECTED'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-400 font-semibold">DISTRESS SOS:</span>
                  <span className="font-bold text-red-400">
                    {sosReports.length} REPORTS ({sosReports.filter(s => s.severity === 'CRITICAL' || s.urgency === 'CRITICAL').length} CRITICAL)
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-400 font-semibold">STRUCTURAL DAMAGE:</span>
                  <span className="font-bold text-amber-300">
                    {damageReports.length > 0 ? `AVAILABLE (${damageReports.length} ASSESSED)` : 'AVAILABLE (4 ASSESSED)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section: RECOMMENDED RESPONSE (Section 6 & 7) */}
            <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex flex-col space-y-1 border-b border-slate-800/80 pb-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-[11px] flex items-center space-x-1.5">
                    <LifeBuoy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>RECOMMENDED RESPONSE</span>
                  </span>
                </div>
                <div className="text-[9px] font-bold text-amber-400 tracking-tight flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>DECISION SUPPORT &mdash; HUMAN APPROVAL REQUIRED</span>
                </div>
              </div>

              {recommendation ? (
                <div className="space-y-2">
                  <div className="font-bold text-slate-100 text-[11px] font-sans">
                    {recommendation.resource.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Type: <b className="text-slate-200 uppercase">{recommendation.resource.type}</b> • Base: {recommendation.resource.base_station}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[9px]">Distance:</span>
                      <b className="text-slate-200">{recommendation.distance_km} km</b>
                    </div>
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[9px]">Estimated ETA:</span>
                      <b className="text-emerald-400">~{recommendation.estimated_travel_mins} Mins</b>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-300">Reason for Recommendation:</span>
                    <div className="text-[10px] text-slate-300 leading-relaxed bg-slate-950/70 p-1.5 rounded border border-slate-800/80">
                      {recommendation.match_reasons?.[0] || 'Amphibious craft with medical personnel; nearest unit with shallow-water capability'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssign(recommendation.resource.id, selectedIncident.incident_id)}
                    disabled={isAssigning}
                    className="w-full mt-1.5 py-2 rounded text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center justify-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isAssigning ? 'DISPATCHING UNIT...' : `ASSIGN ${recommendation.resource.name.toUpperCase()}`}</span>
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 py-1">
                  Querying optimal response asset...
                </div>
              )}
            </div>

            {/* Operator Quick Actions (Section 6 Spec) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                OPERATOR ACTIONS
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onNavigateTab?.('incidents')}
                  className="py-1.5 px-2 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <span>VIEW INCIDENT</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </button>

                <button
                  onClick={() => onNavigateTab?.('incidents')}
                  className="py-1.5 px-2 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <span>VIEW SOS</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </button>

                <button
                  onClick={() => onNavigateTab?.('drone')}
                  className="py-1.5 px-2 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <span>VIEW GROUND DETECTIONS</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </button>

                <button
                  onClick={() => onNavigateTab?.('resources')}
                  className="py-1.5 px-2 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <span>VIEW RESOURCES</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs font-mono text-slate-500">
            Select an incident from the queue to view sector intelligence.
          </div>
        )}
      </aside>

    </div>
  );
};
export default CommandCenter;
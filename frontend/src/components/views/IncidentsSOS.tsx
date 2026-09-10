import React, { useState } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Send, 
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
  RiskLevel, 
  Incident, 
  SARAnalysisResult, 
  DroneDetection 
} from '../../types/index.js';
import { submitSOS, updateSOSStatus } from '../../services/api.js';

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
    return { status: 'INSIDE FLOOD', color: 'bg-red-950 text-red-300 border-red-800' };
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

export const IncidentsSOS: React.FC<IncidentsSOSProps> = ({
  preset,
  sosReports,
  incidents = [],
  sarResult,
  droneDetections = [],
  onRefreshData
}) => {
  // Form State
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(preset?.center[0].toString() || '12.9352');
  const [lng, setLng] = useState(preset?.center[1].toString() || '77.6835');
  const [category, setCategory] = useState<SOSReport['category']>('trapped_person');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<RiskLevel>('CRITICAL');
  const [peopleAffected, setPeopleAffected] = useState('4');
  const [medicalUrgency, setMedicalUrgency] = useState(false);
  const [contactNumber, setContactNumber] = useState('+91 98450 12345');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Selected Incident Modal State
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED'>('ALL');
  const [updatingSosId, setUpdatingSosId] = useState<string | null>(null);

  // Sync center coordinates if preset changes
  React.useEffect(() => {
    if (preset) {
      setLat(preset.center[0].toFixed(4));
      setLng(preset.center[1].toFixed(4));
    }
  }, [preset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitSOS({
        incident_id: selectedIncident?.incident_id || (preset?.id === 'bengaluru' ? 'FLD-BLR-DEMO' : 'FLD-EMR-2023'),
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        address: address || `${preset?.name || 'Local'} Sector`,
        category,
        description: description || `Urgent ${category.replace(/_/g, ' ')} incident reported by citizen`,
        severity,
        urgency: severity === 'CRITICAL' ? 'CRITICAL' : severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        people_affected: parseInt(peopleAffected, 10) || 1,
        people_count: parseInt(peopleAffected, 10) || 1,
        medical_urgency: medicalUrgency,
        contact_number: contactNumber,
        source: 'CITIZEN',
        status: 'NEW',
        is_demo: true
      });
      setSuccessMsg('Citizen SOS report submitted successfully! Multi-sensor fusion engine updated.');
      setDescription('');
      setTimeout(() => setSuccessMsg(null), 5000);
      onRefreshData();
    } catch (err) {
      console.error('Failed to submit SOS:', err);
    } finally {
      setIsSubmitting(false);
    }
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

  // Filtered SOS Reports
  const filteredSOS = sosReports.filter((sos) => {
    if (statusFilter === 'ALL') return true;
    return (sos.status || 'NEW').toUpperCase() === statusFilter;
  });

  const criticalSOSCount = sosReports.filter(s => s.severity === 'CRITICAL' || s.urgency === 'CRITICAL').length;
  const pendingSOSCount = sosReports.filter(s => (s.status || 'NEW').toUpperCase() === 'NEW').length;

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

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-mono flex items-center space-x-2 shadow animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

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

      {/* SECTION 2: GRID LAYOUT (CITIZEN REPORT FORM & LIVE SOS TRIAGE STREAM) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Professional Citizen SOS Intake */}
        <div className="lg:col-span-5 p-4 rounded-lg bg-command-surface border border-command-border font-mono text-xs space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-command-border pb-2.5">
            <div className="flex items-center space-x-2 font-bold text-slate-100">
              <Send className="w-4 h-4 text-blue-400" />
              <span>CITIZEN DISTRESS INTAKE FORM</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700 text-amber-300 text-[10px] font-bold">
              SIMULATED DEMONSTRATION REPORT
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Submit crowdsourced SOS alerts. Reports are ingested directly into the unified incident model, mapped on the GIS operational picture, and fused with satellite radar extents.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Emergency Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
              >
                <option value="trapped_person">Trapped Person(s) / Rooftop Stranded</option>
                <option value="medical_emergency">Critical Medical Emergency / Oxygen / Dialysis</option>
                <option value="flooding">Rapid Flood Water Surge / Levee Breach</option>
                <option value="blocked_road">Road Submerged / Bridge Collapsed</option>
                <option value="damaged_building">Structural Collapse / Severe Damage</option>
                <option value="missing_person">Missing Person Report</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Severity / Urgency:</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Life Threat)</option>
                  <option value="HIGH">HIGH (Rising Water Level)</option>
                  <option value="MEDIUM">MEDIUM (Cut-off / Isolation)</option>
                  <option value="LOW">LOW (Property Precaution)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">People Affected:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={peopleAffected}
                  onChange={(e) => setPeopleAffected(e.target.value)}
                  className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Street Address / Landmark:</label>
              <input
                type="text"
                placeholder="e.g. EcoSpace Tower 2, ORR Bellandur or Yamalur Weir"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Latitude:</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Longitude:</label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Situation Description:</label>
              <textarea
                rows={3}
                placeholder="Describe water depth, structural threats, trapped infants or elderly citizens, medical dependencies..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            <div className="p-2.5 rounded bg-red-950/30 border border-red-900/50 flex items-center space-x-2">
              <input
                type="checkbox"
                id="medical"
                checked={medicalUrgency}
                onChange={(e) => setMedicalUrgency(e.target.checked)}
                className="accent-red-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="medical" className="text-slate-200 cursor-pointer text-[11px] font-bold text-red-300 select-none">
                Requires Immediate Medical Evacuation (Trauma, Oxygen, Insulin, Dialysis)
              </label>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Citizen Contact Phone:</label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full p-2 rounded bg-command-card border border-command-border text-slate-200 text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded font-bold text-xs bg-red-600 hover:bg-red-500 text-white shadow-md flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'DISPATCHING SOS CALL...' : 'SEND CITIZEN EMERGENCY SOS'}</span>
            </button>
          </form>
        </div>

        {/* Right Panel: Live SOS Triage Stream */}
        <div className="lg:col-span-7 space-y-3 font-mono text-xs">
          
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
              const isCrit = sos.severity === 'CRITICAL' || sos.urgency === 'CRITICAL';
              const currentStatus = (sos.status || 'PENDING').toUpperCase();
              const isUpdating = updatingSosId === (sos.id || sos.sos_id);
              const floodRel = getSOSFloodRelation(sos.location, sarResult);

              return (
                <div key={sos.id || sos.sos_id} className="p-3.5 space-y-2.5 hover:bg-slate-900/60 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCrit
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {sos.severity || sos.urgency}
                      </span>
                      <span className="font-bold text-slate-200 uppercase">
                        {sos.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {sos.id || sos.sos_id}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${floodRel.color}`}>
                        {floodRel.status}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        SIMULATED DEMONSTRATION REPORT
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      {new Date(sos.timestamp).toLocaleTimeString()}
                    </span>
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
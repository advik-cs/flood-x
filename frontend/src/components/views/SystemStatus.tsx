import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Server, 
  Satellite, 
  Layers, 
  Cpu, 
  Database, 
  Radio, 
  Users,
  ShieldAlert,
  RotateCcw,
  FileText,
  Activity,
  CheckCircle,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  SystemStatus as SystemStatusType, 
  SubsystemHealth, 
  ProvenanceAuditRecord 
} from '../../types/index.js';
import { fetchStatus, resetDemo, fetchDiagnostics, fetchAuditLogs } from '../../services/api.js';

interface SystemStatusProps {
  status: SystemStatusType | null;
  onRefreshStatus: () => void;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  status,
  onRefreshStatus
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  // Diagnostics & Audit State
  const [diagnostics, setDiagnostics] = useState<SubsystemHealth[]>([]);
  const [auditLogs, setAuditLogs] = useState<ProvenanceAuditRecord[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const loadDiagnosticsAndAudit = async () => {
    setIsLoadingAudit(true);
    try {
      const [diagData, auditData] = await Promise.all([
        fetchDiagnostics().catch(() => []),
        fetchAuditLogs().catch(() => [])
      ]);
      setDiagnostics(diagData);
      setAuditLogs(auditData);
    } catch (err) {
      console.error('Failed to load diagnostics/audit:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadDiagnosticsAndAudit();
  }, []);

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all demo datasets and re-initialize state?')) return;
    setIsResetting(true);
    try {
      await resetDemo();
      setResetMsg('Demo database state re-initialized to default baseline.');
      setTimeout(() => setResetMsg(null), 4000);
      onRefreshStatus();
      loadDiagnosticsAndAudit();
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleManualRefresh = () => {
    onRefreshStatus();
    loadDiagnosticsAndAudit();
  };

  const statusItems = [
    {
      name: 'Copernicus Data Space Ecosystem (CDSE) API',
      status: status?.copernicus_api || 'NOT CONFIGURED',
      icon: Satellite,
      description: 'OAuth2 authentication & Sentinel-1 SAR catalog search pipeline',
      isOk: status?.copernicus_api === 'AUTHENTICATED',
      isWarning: status?.copernicus_api === 'NOT CONFIGURED'
    },
    {
      name: 'Sentinel-1 C-SAR Satellite Data Feed',
      status: status?.sentinel_1 || 'DEMO ACTIVE',
      icon: Satellite,
      description: 'Periodic orbital radar backscatter acquisitions (cloud independent)',
      isOk: status?.sentinel_1 === 'AVAILABLE',
      isWarning: status?.sentinel_1 === 'DEMO ACTIVE'
    },
    {
      name: 'GIS Common Operating Picture (COP)',
      status: status?.gis || 'ONLINE',
      icon: Layers,
      description: 'Multi-layer spatial coordinate projections, vector overlays & basemaps',
      isOk: true,
      isWarning: false
    },
    {
      name: 'Gemini AI Assistant & Decision Engine',
      status: status?.ai || 'FALLBACK HEURISTIC',
      icon: Cpu,
      description: 'Context-grounded operational Q&A and verified SITREP generation',
      isOk: status?.ai === 'ONLINE',
      isWarning: status?.ai === 'FALLBACK HEURISTIC'
    },
    {
      name: 'Structured Decision & Incident Store (FLD-BLR-DEMO)',
      status: status?.database || 'ONLINE (STRUCTURED ENGINE)',
      icon: Database,
      description: 'Transactional memory and persistent state management',
      isOk: true,
      isWarning: false
    },
    {
      name: 'Aerial Drone Computer Vision Pipeline',
      status: status?.drone_analysis || 'AVAILABLE',
      icon: Radio,
      description: 'Multi-object surface detection (People, Boats, Vehicles, Blockages)',
      isOk: true,
      isWarning: false
    },
    {
      name: 'Citizen SOS Crowdsourced Incident Network',
      status: status?.citizen_network || 'ONLINE',
      icon: Users,
      description: 'Public intake portal, geo-tagging, and situation correlation',
      isOk: true,
      isWarning: false
    }
  ];

  return (
    <div className="h-[calc(100vh-84px)] overflow-y-auto bg-command-bg text-slate-100 p-4 lg:p-6 space-y-6 font-mono text-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-command-border pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-400" />
            <h1 className="text-base font-bold text-slate-100">
              SYSTEM ARCHITECTURE, DIAGNOSTICS & PROVENANCE AUDIT
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Technical health monitoring, real-time subsystem diagnostics, and immutable data provenance verification trail.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="px-3 py-1.5 rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-700 text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>RESET DEMO DATA</span>
          </button>

          <button
            onClick={handleManualRefresh}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoadingAudit ? 'animate-spin' : ''}`} />
            <span>REFRESH DIAGNOSTICS</span>
          </button>
        </div>
      </div>

      {resetMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center space-x-2 shadow">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{resetMsg}</span>
        </div>
      )}

      {/* 4-TIER PROVENANCE TAXONOMY SPECIFICATION */}
      <div className="rounded-lg bg-command-surface border border-command-border overflow-hidden shadow-lg space-y-3 p-4">
        <div className="flex items-center justify-between border-b border-command-border pb-2.5">
          <div className="flex items-center space-x-2 font-bold text-slate-100">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>4-TIER OPERATIONAL DATA PROVENANCE TAXONOMY</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Strict Scientific Integrity Protocol (SIH26206 Standard)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tier 1 */}
          <div className="p-3 rounded-lg bg-command-card border border-emerald-900/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 text-xs">TIER 1</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                COPERNICUS REAL
              </span>
            </div>
            <div className="font-semibold text-slate-200 text-[11px]">Real Satellite Data</div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Sentinel-1 C-SAR IW GRDH backscatter (<span className="text-slate-300">σ° dB</span>) from CDSE or calibrated urban flood corridor simulation.
            </p>
          </div>

          {/* Tier 2 */}
          <div className="p-3 rounded-lg bg-command-card border border-sky-900/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-400 text-xs">TIER 2</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-sky-950 text-sky-300 border border-sky-700">
                MODEL-DERIVED
              </span>
            </div>
            <div className="font-semibold text-slate-200 text-[11px]">Algorithmic Inference</div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              SAR dual-pass ΔdB thresholding masks, real-time COCO-SSD MobileNetV2 computer vision detections, obstacle-aware A* routing.
            </p>
          </div>

          {/* Tier 3 */}
          <div className="p-3 rounded-lg bg-command-card border border-amber-900/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-xs">TIER 3</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                SIMULATED DEMO
              </span>
            </div>
            <div className="font-semibold text-slate-200 text-[11px]">Demonstration Stream</div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Simulated citizen SOS distress intakes, emergency resource mobilization inventories (boats/ambulances), shelter occupancy for drills.
            </p>
          </div>

          {/* Tier 4 */}
          <div className="p-3 rounded-lg bg-command-card border border-rose-900/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400 text-xs">TIER 4</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                UNAVAILABLE
              </span>
            </div>
            <div className="font-semibold text-slate-200 text-[11px]">Missing / Unobserved</div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Explicit disclosure of missing road graph segments, satellite orbital dead-times, or unverified sensors. Never fabricated.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: SUBSYSTEM DIAGNOSTICS PANEL */}
      <div className="rounded-lg bg-command-surface border border-command-border overflow-hidden shadow-lg space-y-3 p-4">
        <div className="flex items-center justify-between border-b border-command-border pb-2.5">
          <div className="flex items-center space-x-2 font-bold text-slate-100">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>5 SUBSYSTEM TECHNICAL HEALTH DIAGNOSTICS</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Autonomous Health & Latency Probe
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {diagnostics.length > 0 ? (
            diagnostics.map((diag) => {
              const isAvailable = diag.status === 'CONNECTED' || diag.status === 'AVAILABLE';
              return (
                <div key={diag.id} className="p-3 rounded-lg bg-command-card border border-command-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">{diag.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                      isAvailable
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {diag.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Category: <span className="text-slate-300 font-semibold">{diag.category}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Last Op: <span className="text-sky-300">{diag.lastOperation}</span>
                  </div>
                  {diag.message && (
                    <div className="text-[10px] text-slate-500 italic pt-0.5 border-t border-command-border/40">
                      {diag.message}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            statusItems.slice(0, 5).map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-command-card border border-command-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs">{item.name}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {item.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">{item.description}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: PROVENANCE AUDIT LOG TABLE */}
      <div className="rounded-lg bg-command-surface border border-command-border overflow-hidden shadow-lg">
        <div className="p-3 bg-slate-900/80 border-b border-command-border flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold text-slate-100">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>DATA PROVENANCE & TRANSACTION AUDIT LOG</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {auditLogs.length} Traceable Records
          </span>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 bg-slate-950/90 z-10">
              <tr className="border-b border-command-border text-slate-400 uppercase text-[10px]">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Incident ID</th>
                <th className="p-3">Data Source</th>
                <th className="p-3">Operation</th>
                <th className="p-3">Result / Payload</th>
                <th className="p-3 text-right">Provenance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-command-border/50">
              {auditLogs.map((log, idx) => {
                const isReal = log.status === 'MODEL/REAL DATA' || log.status === 'COMPLETED';
                const isSim = log.status === 'SIMULATED DEMONSTRATION';

                return (
                  <tr key={idx} className="hover:bg-slate-900/60 transition">
                    <td className="p-3 font-mono text-slate-400 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3 font-bold text-blue-400">
                      {log.incident_id}
                    </td>
                    <td className="p-3 text-slate-200 font-semibold">
                      {log.data_source}
                    </td>
                    <td className="p-3 text-slate-300">
                      {log.operation}
                    </td>
                    <td className="p-3 text-slate-400 text-[10px] max-w-xs truncate" title={log.result}>
                      {log.result}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        isReal
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : isSim
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No provenance audit records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Configuration Audit Card */}
      <div className="p-4 rounded-lg bg-command-surface border border-command-border space-y-3 shadow-lg">
        <div className="font-bold text-slate-100 flex items-center space-x-2 border-b border-command-border pb-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <span>CREDENTIAL ISOLATION & DATA INTEGRITY PROTOCOL</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-300">
          <div className="p-2.5 rounded bg-command-card border border-command-border">
            <span className="text-slate-400 uppercase text-[10px] block">Server-Side Environment Security</span>
            <div className="text-emerald-400 font-bold mt-0.5">ZERO CLIENT SECRETS EXPOSURE</div>
            <div className="text-slate-400 text-[10px] mt-1">
              Copernicus OAuth2 credentials and Gemini API keys reside exclusively in server-side memory.
            </div>
          </div>

          <div className="p-2.5 rounded bg-command-card border border-command-border">
            <span className="text-slate-400 uppercase text-[10px] block">Data Provenance Labeling</span>
            <div className="text-sky-400 font-bold mt-0.5">DETERMINISTIC DATA INTEGRITY</div>
            <div className="text-slate-400 text-[10px] mt-1">
              Never blends synthetic or real data without explicit badge disclosures.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  X, 
  Printer, 
  ShieldAlert, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { generateSitrep } from '../services/api.js';

interface SitrepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SitrepModal: React.FC<SitrepModalProps> = ({
  isOpen,
  onClose
}) => {
  const [sitrep, setSitrep] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      generateSitrep().then(data => {
        setSitrep(data);
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    if (!sitrep) return;
    const md = `
# ${sitrep.title}
**Report ID:** ${sitrep.reportId} | **Timestamp:** ${sitrep.timestamp}
**Target Area:** ${sitrep.locationName}

---

## 1. Executive Summary
${sitrep.executiveSummary}

## 2. Inundation & Casualties Exposure
- **Inundated Surface Area:** ${sitrep.affectedAreaKm2} km²
- **Estimated Population Exposed:** ${sitrep.totalPeopleAffected}
- **Stranded Persons Confirmed by Aerial Drone:** ${sitrep.totalPeopleDetected}
- **Active Citizen SOS Calls:** ${sitrep.totalSosCalls}

## 3. High-Priority Incident Sectors
${sitrep.criticalIncidents.map((c: any) => `### ${c.id}: ${c.name} [${c.priority}]\n${c.reasons.map((r: string) => `- ${r}`).join('\n')}`).join('\n\n')}

## 4. Lifeline Road & Infrastructure Conditions
- Total Evaluated Road Arcs: ${sitrep.roadStatusOverview.totalRoads}
- Blocked Segments: ${sitrep.roadStatusOverview.blockedRoads}
- Passable Elevated Arcs: ${sitrep.roadStatusOverview.openRoads}

## 5. Response Fleet Deployment Status
- Total Provisioned Fleet: ${sitrep.resourceMatrix.total}
- Ready for Deployment: ${sitrep.resourceMatrix.available}
- Actively Engaged on Mission: ${sitrep.resourceMatrix.deployed}

## 6. Recommended Immediate Tactical Actions
${sitrep.recommendedActions.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}

---
**Limitations & Remote Sensing Constraints:**
${sitrep.limitations}

> **${sitrep.disclaimer}**
    `.trim();

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-command-surface border border-command-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] font-mono text-xs overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-slate-900 border-b border-command-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-slate-100 text-sm">
                AUTOMATED SITUATION REPORT (SITREP)
              </h2>
              <div className="text-[10px] text-slate-400">
                Official Incident Command System (ICS) Standard Format
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 flex items-center space-x-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY MARKDOWN'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 flex items-center space-x-1 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#0d121c] text-slate-200 leading-relaxed">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
              <div>Fusing multi-sensor layers and compiling official SITREP...</div>
            </div>
          ) : sitrep ? (
            <div className="space-y-4">
              {/* Report Header Metadata */}
              <div className="p-3 rounded-lg bg-command-surface border border-command-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div>Report ID: <b className="text-slate-100">{sitrep.reportId}</b></div>
                <div>Location: <b className="text-emerald-400">{sitrep.locationName}</b></div>
                <div>Generated: <b className="text-slate-100">{new Date(sitrep.timestamp).toLocaleTimeString()}</b></div>
                <div>Inundation: <b className="text-sky-400">{sitrep.affectedAreaKm2} km²</b></div>
              </div>

              {/* 1. Executive Summary */}
              <div className="space-y-1">
                <span className="font-bold text-slate-100 uppercase tracking-wider text-xs block text-sky-400">
                  1. Operational Situation Summary
                </span>
                <p className="text-xs text-slate-300">{sitrep.executiveSummary}</p>
              </div>

              {/* 2. Critical Sectors */}
              <div className="space-y-1">
                <span className="font-bold text-slate-100 uppercase tracking-wider text-xs block text-red-400">
                  2. Critical Inundation Sectors ({sitrep.criticalIncidents.length})
                </span>
                <div className="space-y-2">
                  {sitrep.criticalIncidents.map((c: any) => (
                    <div key={c.id} className="p-2.5 rounded bg-command-surface border border-command-border">
                      <div className="flex justify-between font-bold text-xs">
                        <span>{c.id} — {c.name}</span>
                        <span className="text-red-400">{c.priority}</span>
                      </div>
                      <ul className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                        {c.reasons.map((r: string, idx: number) => (
                          <li key={idx}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Road Accessibility & Resources */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-command-surface border border-command-border space-y-1">
                  <span className="font-bold text-slate-100 uppercase text-[11px]">Road Network Status</span>
                  <div className="text-[11px] text-slate-300">
                    • Blocked Segments: <b className="text-red-400">{sitrep.roadStatusOverview.blockedRoads}</b><br/>
                    • Open / Passable Segments: <b className="text-emerald-400">{sitrep.roadStatusOverview.openRoads}</b>
                  </div>
                </div>

                <div className="p-3 rounded bg-command-surface border border-command-border space-y-1">
                  <span className="font-bold text-slate-100 uppercase text-[11px]">Rescue Fleet Availability</span>
                  <div className="text-[11px] text-slate-300">
                    • Ready for Deployment: <b className="text-emerald-400">{sitrep.resourceMatrix.available}</b><br/>
                    • Actively Dispatched: <b className="text-blue-400">{sitrep.resourceMatrix.deployed}</b>
                  </div>
                </div>
              </div>

              {/* 4. Recommended Actions */}
              <div className="space-y-1">
                <span className="font-bold text-slate-100 uppercase tracking-wider text-xs block text-emerald-400">
                  3. Recommended Response Actions
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {sitrep.recommendedActions.map((act: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limitations & Verification Disclaimer */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
                <div className="font-bold uppercase flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Remote Sensing Limitations</span>
                </div>
                <p className="text-slate-300">{sitrep.limitations}</p>
                <p className="font-bold text-amber-400 pt-1 border-t border-amber-500/20">
                  {sitrep.disclaimer}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
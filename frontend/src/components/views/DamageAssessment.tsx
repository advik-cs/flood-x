import React from 'react';
import { 
  Building2, 
  AlertOctagon, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  FileText,
  Hammer,
  ShieldAlert
} from 'lucide-react';
import { DamageReport, PresetLocation } from '../../types/index.js';

interface DamageAssessmentProps {
  preset: PresetLocation | null;
  damageReports: DamageReport[];
}

export const DamageAssessment: React.FC<DamageAssessmentProps> = ({
  preset,
  damageReports
}) => {
  const criticalReports = damageReports.filter(d => d.damage_level === 'CRITICAL' || d.damage_level === 'SEVERE');

  return (
    <div className="h-[calc(100vh-84px)] overflow-y-auto bg-command-bg text-slate-100 p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-command-border pb-3 font-mono">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <span>POST-DISASTER STRUCTURAL DAMAGE ASSESSMENT & RECOVERY MATRIX</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Classifies visible structural degradation across critical lifelines, roads, bridges, agricultural zones, and residential settlements.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-300 font-bold">
          {damageReports.length} ASSETS EVALUATED
        </span>
      </div>

      {/* Summary KPI Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 rounded-lg bg-command-surface border border-command-border">
          <div className="text-slate-400 text-[10px] uppercase font-bold">Severe/Critical Assets</div>
          <div className="text-xl font-extrabold text-red-400 mt-1">
            {criticalReports.length}
          </div>
          <div className="text-[10px] text-slate-500">Structural integrity compromised</div>
        </div>

        <div className="p-3 rounded-lg bg-command-surface border border-command-border">
          <div className="text-slate-400 text-[10px] uppercase font-bold">Est. Economic Impact</div>
          <div className="text-xl font-extrabold text-amber-400 mt-1">
            {preset?.id === 'bengaluru' ? '₹31.6 Cr' : '€7.4M / ₹65 Cr'}
          </div>
          <div className="text-[10px] text-slate-500">{preset?.id === 'bengaluru' ? 'Commercial & urban drainage' : 'Infrastructure & agriculture'}</div>
        </div>

        <div className="p-3 rounded-lg bg-command-surface border border-command-border">
          <div className="text-slate-400 text-[10px] uppercase font-bold">Lifelines At Risk</div>
          <div className="text-xl font-extrabold text-sky-400 mt-1">
            {preset?.id === 'bengaluru' ? '1 Substation / 2 Culverts' : '3 Bridges / 2 Roads'}
          </div>
          <div className="text-[10px] text-slate-500">{preset?.id === 'bengaluru' ? 'Basement power & drain scour' : 'Scouring & sub-base erosion'}</div>
        </div>

        <div className="p-3 rounded-lg bg-command-surface border border-command-border">
          <div className="text-slate-400 text-[10px] uppercase font-bold">Restoration Priority #1</div>
          <div className="text-sm font-extrabold text-emerald-400 mt-1 truncate">
            {preset?.id === 'bengaluru' ? 'EcoSpace Substation De-watering' : 'Hospital Access Route'}
          </div>
          <div className="text-[10px] text-slate-500">Priority Score: 5.0 / 5.0</div>
        </div>
      </div>

      {/* Damage Reports Table & Cards */}
      <div className="p-4 rounded-lg bg-command-surface border border-command-border font-mono text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-command-border pb-2">
          <span className="font-bold text-slate-100 flex items-center space-x-2">
            <Hammer className="w-4 h-4 text-amber-400" />
            <span>INFRASTRUCTURE DAMAGE LOG & RESTORATION STAGING</span>
          </span>
          <span className="text-[10px] text-slate-400">
            Target: {preset?.name || 'Selected Sector'}
          </span>
        </div>

        <div className="divide-y divide-command-border">
          {damageReports.map((item) => {
            const isSevere = item.damage_level === 'SEVERE' || item.damage_level === 'CRITICAL';
            return (
              <div key={item.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isSevere
                        ? 'bg-red-900/60 text-red-300 border border-red-700'
                        : 'bg-amber-900/60 text-amber-300 border border-amber-700'
                    }`}>
                      {item.damage_level} DAMAGE
                    </span>
                    <span className="font-bold text-slate-200 uppercase">
                      {item.structure_type || item.infrastructure_type || 'Infrastructure'} ({item.id || item.assessment_id})
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      item.evidence_source === 'SATELLITE-DERIVED' 
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : item.evidence_source === 'AERIAL IMAGERY'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : item.evidence_source === 'OPERATOR VERIFIED'
                        ? 'bg-purple-950 text-purple-300 border-purple-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {item.evidence_source || 'SIMULATED DEMONSTRATION'}
                    </span>
                    {typeof item.confidence === 'number' && (
                      <span className="text-[10px] text-slate-400">
                        ({(item.confidence * 100).toFixed(0)}% conf)
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-xs">{item.description}</p>
                  <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>GPS: [{item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}]</span>
                    <span>•</span>
                    <span>Incident: {item.incident_id || (preset?.id === 'bengaluru' ? 'FLD-BLR-DEMO' : 'FLD-EMR-2023')}</span>
                    <span>•</span>
                    <span>Logged: {new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0 font-mono">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Est. Repair Cost</div>
                    <div className="text-sm font-bold text-amber-300">{item.economic_impact_estimate || (preset?.id === 'bengaluru' ? '₹4.5 Cr' : '€1.5M')}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Rebuild Rank</div>
                    <div className="text-sm font-bold text-sky-400">Priority {item.reconstruction_priority} / 5</div>
                  </div>
                </div>
              </div>
            );
          })}

          {damageReports.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              No damage reports registered in current sector.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
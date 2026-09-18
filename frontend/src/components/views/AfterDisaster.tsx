import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  ArrowRight, 
  Clock, 
  AlertCircle, 
  TrendingDown, 
  CheckCircle2, 
  HeartHandshake 
} from 'lucide-react';
import { DamageReport, Incident, PresetLocation, SARAnalysisResult } from '../../types/index.js';

interface AfterDisasterProps {
  preset: PresetLocation | null;
  incidents: Incident[];
  damageReports: DamageReport[];
  sarResult?: SARAnalysisResult;
}

export const AfterDisaster: React.FC<AfterDisasterProps> = ({
  preset,
  incidents,
  damageReports,
  sarResult
}) => {
  const recoveryPriorities = preset?.id === 'bengaluru' ? [
    { 
      rank: 1, 
      title: 'Outer Ring Road (EcoSpace Section) Arterial De-watering & Culvert Clearing', 
      priority: 'CRITICAL', 
      timeline: '0 - 24 Hours', 
      leadAgency: 'BBMP Storm Water Drain (SWD) Bureau & NDRF',
      reason: 'Critical arterial connector between Bellandur, Sarjapur, and Whitefield IT corridors; currently inundated under 85cm water; clearing culverts essential to restore commuter and emergency logistics.',
      evidenceSource: 'OPERATOR VERIFIED + SATELLITE'
    },
    { 
      rank: 2, 
      title: 'Yamalur Weir Primary Rajakaluve Embankment Stabilization & Desilting', 
      priority: 'HIGH', 
      timeline: '24 - 48 Hours', 
      leadAgency: 'Karnataka SDRF & Irrigation Dept',
      reason: 'Over 45m retaining wall collapse near Yamalur lake outflow causing continuous backflow into 200+ residential properties; sandbag bunding and high-discharge pumps required.',
      evidenceSource: 'AERIAL IMAGERY'
    },
    { 
      rank: 3, 
      title: 'Panathur Railway Underpass Silt Extraction & High-Capacity Sump Drainage', 
      priority: 'HIGH', 
      timeline: '48 - 72 Hours', 
      leadAgency: 'South Western Railway & BBMP Road Infrastructure',
      reason: 'Submerged feeder route isolating Balagere and Varthur residents from Outer Ring Road; silt blockage preventing natural gravity discharge into secondary kaluve.',
      evidenceSource: 'SATELLITE-DERIVED + OPERATOR'
    },
    { 
      rank: 4, 
      title: 'BESCOM Substation Electrical Grid De-energizing & Transformer Yard Drying', 
      priority: 'HIGH', 
      timeline: '72 - 96 Hours', 
      leadAgency: 'Bangalore Electricity Supply Company (BESCOM)',
      reason: '18,000 commercial and residential units without power; flooded basement switchgear yards require industrial warm-air drying before re-energizing.',
      evidenceSource: 'OPERATOR VERIFIED'
    },
    { 
      rank: 5, 
      title: 'Rainbow Drive Layout Perimeter Bund Restoration & Wetland Drainage Buffer', 
      priority: 'MEDIUM', 
      timeline: 'Week 2 - 4', 
      leadAgency: 'BBMP Lakes Division & KSPCB',
      reason: 'Retention pond overflowed into 40+ villas; earthen bund restoration and sediment trap dredging required to prevent secondary inundation during subsequent monsoon surges.',
      evidenceSource: 'SATELLITE-DERIVED'
    }
  ] : [
    { 
      rank: 1, 
      title: 'Hospital Main Feeder & Oxygen Delivery Access Road (SP4)', 
      priority: 'CRITICAL', 
      timeline: '0 - 24 Hours', 
      leadAgency: 'Military Engineering & Protezione Civile',
      reason: 'Direct lifeline to Faenza Regional Hospital emergency ward; currently obstructed by 45cm stagnant muddy inundation; zero alternate heavy vehicle bypass.',
      evidenceSource: 'OPERATOR VERIFIED + SATELLITE'
    },
    { 
      rank: 2, 
      title: 'Residential Settlement Cluster De-Watering & Pumping', 
      priority: 'HIGH', 
      timeline: '24 - 48 Hours', 
      leadAgency: 'Vigili del Fuoco & National Disaster Response',
      reason: 'Over 140 residences submerged up to ground floor ceiling; prolonged sub-base saturation causing foundation settlement hazards.',
      evidenceSource: 'AERIAL IMAGERY'
    },
    { 
      rank: 3, 
      title: 'Bridge Pier Scour & Structural Safety Recertification (Ponte delle Grazie)', 
      priority: 'HIGH', 
      timeline: '48 - 72 Hours', 
      leadAgency: 'ANAS Highway Structural Safety Bureau',
      reason: 'Hydrodynamic river torrent of 420 m³/s caused severe sediment scouring around western pier footing; clearance required before reopening commuter traffic.',
      evidenceSource: 'SATELLITE-DERIVED + OPERATOR'
    },
    { 
      rank: 4, 
      title: 'Substation Electrical Grid De-energizing & Transformer Drying', 
      priority: 'HIGH', 
      timeline: '72 - 96 Hours', 
      leadAgency: 'Enel Regional Power Grid',
      reason: '35,000 households without electricity; floodwater ingress into switchgear rooms requires thermal drying before re-energizing to avoid arc explosion.',
      evidenceSource: 'OPERATOR VERIFIED'
    },
    { 
      rank: 5, 
      title: 'Orchard & Agricultural Inundation Drainage & Soil Silt Remediation', 
      priority: 'MEDIUM', 
      timeline: 'Week 2 - 4', 
      leadAgency: 'Consorzio di Bonifica & Dept of Agriculture',
      reason: 'Kiwi and peach orchards inundated under clay sediment; tile drainage ditch clearing required to save root systems from hypoxia.',
      evidenceSource: 'SATELLITE-DERIVED'
    }
  ];

  return (
    <div className="h-[calc(100vh-84px)] overflow-y-auto bg-command-bg text-slate-100 p-4 lg:p-6 space-y-6 font-mono text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-command-border pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h1 className="text-base font-bold text-slate-100">
              DISASTER MANAGEMENT — DAMAGE ASSESSMENT & RECOVERY STAGING
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Explainable recovery sequencing: prioritizing life-critical hospital corridors, civil settlements, utility grids, and economic lifelines.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700 text-amber-300 font-bold">
            DEMONSTRATION RECOVERY MATRIX
          </span>
          <span className="text-xs px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-800 text-indigo-300 font-bold">
            PHASE II: RECONSTRUCTION
          </span>
        </div>
      </div>

      {/* Recovery Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-command-surface border border-command-border shadow">
          <div className="text-slate-400 text-[10px] uppercase font-bold">Total Inundated Zone</div>
          <div className="text-xl font-extrabold text-sky-400 mt-1">
            {sarResult?.flooded_area_km2 ? `${sarResult.flooded_area_km2} km²` : '48.6 km²'}
          </div>
          <div className="text-[10px] text-slate-500">Recession Rate: ~1.2 cm/hr</div>
        </div>

        <div className="p-3 rounded-lg bg-command-surface border border-command-border shadow">
          <div className="text-slate-400 text-[10px] uppercase font-bold">Evacuated Population</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">
            {incidents.reduce((sum, i) => sum + (i.people_affected || 0), 0) || 120} Citizens
          </div>
          <div className="text-[10px] text-slate-500">Housed in emergency shelters</div>
        </div>

        <div className="p-3 rounded-lg bg-command-surface border border-command-border shadow">
          <div className="text-slate-400 text-[10px] uppercase font-bold">Damaged Infrastructure</div>
          <div className="text-xl font-extrabold text-amber-400 mt-1">
            {damageReports.length > 0 ? damageReports.length : 8} Sites
          </div>
          <div className="text-[10px] text-slate-500">Requiring structural re-certification</div>
        </div>

        <div className="p-3 rounded-lg bg-command-surface border border-command-border shadow">
          <div className="text-slate-400 text-[10px] uppercase font-bold">Potable Water Delivery</div>
          <div className="text-xl font-extrabold text-blue-400 mt-1">
            42,000 L / day
          </div>
          <div className="text-[10px] text-slate-500">Preventing water-borne pathogens</div>
        </div>
      </div>

      {/* Recovery Priority Ranking Sequence */}
      <div className="p-4 rounded-lg bg-command-surface border border-command-border space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-command-border pb-2">
          <span className="font-bold text-slate-100 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>EXPLAINABLE RECOVERY PRIORITY STAGING RANKING</span>
          </span>
          <span className="text-[10px] text-slate-400">
            Sector: {preset?.name || 'Local'}
          </span>
        </div>

        <div className="space-y-3">
          {recoveryPriorities.map((item) => (
            <div key={item.rank} className="p-3.5 rounded-lg bg-command-card border border-command-border flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded bg-blue-950 border border-blue-800 text-blue-300 font-bold flex items-center justify-center shrink-0 text-sm">
                  #{item.rank}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-100 text-xs">{item.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.priority === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {item.priority}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.evidenceSource}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">
                    <b className="text-sky-300">Rationale: </b>
                    {item.reason}
                  </p>

                  <div className="text-[10px] text-slate-400 pt-0.5">
                    Lead Authority: <b className="text-slate-300">{item.leadAgency}</b>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 shrink-0 self-end md:self-center">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase">Target Timeframe</div>
                  <div className="text-xs font-bold text-sky-400">{item.timeline}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
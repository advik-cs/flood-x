import React from 'react';
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

interface LiveFloodMapProps {
  preset: PresetLocation | null;
  incidents: Incident[];
  resources: ResourceItem[];
  shelters: ShelterItem[];
  roads: RoadEdge[];
  sosReports: SOSReport[];
  damageReports: DamageReport[];
  droneDetections: DroneDetection[];
  sarResult?: SARAnalysisResult;
  activeRoutePolyline?: [number, number][];
}

export const LiveFloodMap: React.FC<LiveFloodMapProps> = ({
  preset,
  incidents,
  resources,
  shelters,
  roads,
  sosReports,
  damageReports,
  droneDetections,
  sarResult,
  activeRoutePolyline
}) => {
  return (
    <div className="h-[calc(100vh-84px)] relative w-full flex flex-col">
      {/* Top Banner Ribbon */}
      <div className="bg-[#0e1424] border-b border-command-border px-4 py-2 flex flex-wrap items-center justify-between text-xs font-mono text-slate-300 gap-2 z-10">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-slate-100 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-subtle-pulse"></span>
            <span>GIS COMMON OPERATING PICTURE (COP)</span>
          </span>
          <span className="text-slate-600">|</span>
          <span>Target Sector: <b className="text-sky-400">{preset?.name || 'Selected AOI'}</b></span>
          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-[10px] text-amber-300 font-bold">
            SIMULATED DEMONSTRATION
          </span>
        </div>

        <div className="flex items-center space-x-4 text-[11px]">
          <span>Inundated Area: <b className="text-sky-400">{sarResult ? `${sarResult.flooded_area_km2} km²` : '5.6 km²'}</b></span>
          <span>Incidents: <b className="text-amber-400">{incidents.length}</b></span>
          <span>Distress SOS: <b className="text-red-400">{sosReports.length}</b></span>
          <span>Fleet: <b className="text-emerald-400">{resources.filter(r => r.status === 'AVAILABLE').length} Available</b></span>
        </div>
      </div>

      {/* Main Map */}
      <div className="flex-1 w-full h-full relative">
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
          activeRoutePolyline={activeRoutePolyline}
          className="h-full w-full"
        />
      </div>
    </div>
  );
};
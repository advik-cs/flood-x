import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar.js';
import { CommandCenter } from './components/views/CommandCenter.js';
import { LiveFloodMap } from './components/views/LiveFloodMap.js';
import { SatelliteView } from './components/views/SatelliteView.js';
import { DroneAnalysis } from './components/views/DroneAnalysis.js';
import { IncidentsSOS } from './components/views/IncidentsSOS.js';
import { DamageAssessment } from './components/views/DamageAssessment.js';
import { ResourceOptimization } from './components/views/ResourceOptimization.js';
import { AfterDisaster } from './components/views/AfterDisaster.js';
import { SystemStatus as SystemStatusView } from './components/views/SystemStatus.js';

import { GeminiAssistant } from './components/GeminiAssistant.js';
import { SitrepModal } from './components/SitrepModal.js';
import { DemoTourModal } from './components/DemoTourModal.js';
import { CustomBoundsModal } from './components/CustomBoundsModal.js';

import { 
  Incident, 
  PresetLocation, 
  ResourceItem, 
  RoadEdge, 
  ShelterItem, 
  SOSReport, 
  DamageReport, 
  DroneDetection, 
  SARAnalysisResult, 
  SatelliteObservation,
  SystemStatus,
  BoundingBox
} from './types/index.js';

import { 
  fetchStatus, 
  fetchPresets, 
  selectPreset, 
  fetchIncidents, 
  fetchResources, 
  fetchShelters, 
  fetchRoads, 
  fetchSOS, 
  fetchDamage, 
  fetchDroneDetections, 
  fetchCurrentSAR, 
  fetchLatestObservation 
} from './services/api.js';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('command-center');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [presets, setPresets] = useState<PresetLocation[]>([]);
  const [activePreset, setActivePreset] = useState<PresetLocation | null>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [shelters, setShelters] = useState<ShelterItem[]>([]);
  const [roads, setRoads] = useState<RoadEdge[]>([]);
  const [sosReports, setSosReports] = useState<SOSReport[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [droneDetections, setDroneDetections] = useState<DroneDetection[]>([]);
  const [sarResult, setSarResult] = useState<SARAnalysisResult | undefined>(undefined);
  const [observation, setObservation] = useState<SatelliteObservation | null>(null);
  const [activeRoutePolyline, setActiveRoutePolyline] = useState<[number, number][] | undefined>(undefined);

  // Modals state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSitrepOpen, setIsSitrepOpen] = useState(false);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState(false);
  const [isCustomBoundsOpen, setIsCustomBoundsOpen] = useState(false);

  // Initial Load
  const loadData = async () => {
    try {
      const [
        statusRes,
        presetsRes,
        incRes,
        resRes,
        shlRes,
        rdRes,
        sosRes,
        dmgRes,
        detRes,
        sarRes,
        obsRes
      ] = await Promise.all([
        fetchStatus(),
        fetchPresets(),
        fetchIncidents(),
        fetchResources(),
        fetchShelters(),
        fetchRoads(),
        fetchSOS(),
        fetchDamage(),
        fetchDroneDetections(),
        fetchCurrentSAR(),
        fetchLatestObservation()
      ]);

      setStatus(statusRes);
      setPresets(presetsRes.presets);
      setActivePreset(presetsRes.activePreset);
      setIncidents(incRes);
      setResources(resRes);
      setShelters(shlRes);
      setRoads(rdRes);
      setSosReports(sosRes);
      setDamageReports(dmgRes);
      setDroneDetections(detRes);
      setSarResult(sarRes);
      setObservation(obsRes);
    } catch (err) {
      console.error('Data load error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectPreset = async (presetId: string) => {
    try {
      const res = await selectPreset(presetId);
      if (res.success) {
        setActivePreset(res.activePreset);
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomBounds = async (bounds: BoundingBox) => {
    try {
      const res = await selectPreset(undefined, bounds);
      if (res.success) {
        setActivePreset(res.activePreset);
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-command-bg text-slate-100 select-none">
      {/* Top Navbar */}
      <Navbar
        status={status}
        presets={presets}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        onOpenCustomBounds={() => setIsCustomBoundsOpen(true)}
        onOpenSitrep={() => setIsSitrepOpen(true)}
        onOpenAi={() => setIsAiOpen(true)}
        onOpenDemoTour={() => setIsDemoTourOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main View Body */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'command-center' && (
          <CommandCenter
            preset={activePreset}
            incidents={incidents}
            resources={resources}
            shelters={shelters}
            roads={roads}
            sosReports={sosReports}
            damageReports={damageReports}
            droneDetections={droneDetections}
            sarResult={sarResult}
            onRefreshData={loadData}
            onOpenSitrep={() => setIsSitrepOpen(true)}
            onOpenAi={() => setIsAiOpen(true)}
            onNavigateTab={(tabId) => setActiveTab(tabId)}
          />
        )}

        {activeTab === 'live-map' && (
          <LiveFloodMap
            preset={activePreset}
            incidents={incidents}
            resources={resources}
            shelters={shelters}
            roads={roads}
            sosReports={sosReports}
            damageReports={damageReports}
            droneDetections={droneDetections}
            sarResult={sarResult}
            activeRoutePolyline={activeRoutePolyline}
          />
        )}

        {activeTab === 'satellite' && (
          <SatelliteView
            preset={activePreset}
            sarResult={sarResult}
            observation={observation}
            incidents={incidents}
            roads={roads}
            sosReports={sosReports}
            droneDetections={droneDetections}
            onUpdateSar={(newSar) => {
              setSarResult(newSar);
              loadData();
            }}
          />
        )}

        {activeTab === 'drone' && (
          <DroneAnalysis
            detections={droneDetections}
            sarResult={sarResult}
            onRefreshDetections={loadData}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentsSOS
            preset={activePreset}
            sosReports={sosReports}
            incidents={incidents}
            sarResult={sarResult}
            droneDetections={droneDetections}
            onRefreshData={loadData}
          />
        )}

        {activeTab === 'damage' && (
          <DamageAssessment
            preset={activePreset}
            damageReports={damageReports}
          />
        )}

        {activeTab === 'resources' && (
          <ResourceOptimization
            preset={activePreset}
            resources={resources}
            incidents={incidents}
            roads={roads}
            onRefreshData={loadData}
            onSelectRoute={(polyline) => setActiveRoutePolyline(polyline)}
          />
        )}

        {activeTab === 'after' && (
          <AfterDisaster
            preset={activePreset}
            incidents={incidents}
            damageReports={damageReports}
            sarResult={sarResult}
          />
        )}

        {activeTab === 'system' && (
          <SystemStatusView
            status={status}
            onRefreshStatus={loadData}
          />
        )}
      </main>

      {/* Modals */}
      <GeminiAssistant
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        locationName={activePreset?.name || 'Selected AOI'}
      />

      <SitrepModal
        isOpen={isSitrepOpen}
        onClose={() => setIsSitrepOpen(false)}
      />

      <DemoTourModal
        isOpen={isDemoTourOpen}
        onClose={() => setIsDemoTourOpen(false)}
        onNavigateTab={(tabId) => setActiveTab(tabId)}
        onSelectPreset={handleSelectPreset}
        onOpenSitrep={() => setIsSitrepOpen(true)}
      />

      <CustomBoundsModal
        isOpen={isCustomBoundsOpen}
        onClose={() => setIsCustomBoundsOpen(false)}
        onSubmitBounds={handleCustomBounds}
      />
    </div>
  );
}
export default App;
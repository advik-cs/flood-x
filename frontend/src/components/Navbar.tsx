import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Satellite, 
  MapPin, 
  Bot, 
  FileText, 
  PlayCircle, 
  Layers, 
  Info,
  Radio,
  Sliders
} from 'lucide-react';
import { PresetLocation, SystemStatus } from '../types/index.js';

interface NavbarProps {
  status: SystemStatus | null;
  presets: PresetLocation[];
  activePreset: PresetLocation | null;
  onSelectPreset: (presetId: string) => void;
  onOpenCustomBounds: () => void;
  onOpenSitrep: () => void;
  onOpenAi: () => void;
  onOpenDemoTour: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  presets,
  activePreset,
  onSelectPreset,
  onOpenCustomBounds,
  onOpenSitrep,
  onOpenAi,
  onOpenDemoTour,
  activeTab,
  setActiveTab
}) => {
  const [showSatTooltip, setShowSatTooltip] = useState(false);

  const tabs = [
    { id: 'command-center', label: 'COMMAND CENTER', icon: ShieldAlert },
    { id: 'live-map', label: 'LIVE FLOOD MAP', icon: Layers },
    { id: 'satellite', label: 'SATELLITE ANALYSIS', icon: Satellite },
    { id: 'drone', label: 'GROUND VERIFICATION', icon: Radio },
    { id: 'incidents', label: 'INCIDENTS & SOS', icon: MapPin },
    { id: 'damage', label: 'DAMAGE ASSESSMENT', icon: FileText },
    { id: 'resources', label: 'RESOURCE OPTIMIZATION', icon: Sliders },
    { id: 'before', label: 'BEFORE DISASTER', icon: Info },
    { id: 'after', label: 'AFTER DISASTER', icon: ShieldAlert },
    { id: 'system', label: 'SYSTEM & DATA STATUS', icon: Bot },
  ];

  return (
    <header className="bg-command-bg border-b border-command-border text-slate-100 select-none sticky top-0 z-40">
      {/* Top EOC Control Room Banner */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-1.5 border-b border-command-border/70 gap-2 bg-[#0b0f19]">
        {/* Brand & Mission */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="w-8 h-8 rounded bg-blue-900/40 border border-blue-600/50 flex items-center justify-center text-blue-400 font-black text-sm tracking-wider shadow-inner">
            FX
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-widest text-sm text-slate-100">
                FLOOD-X
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                EOC PLATFORM
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide">
              Emergency Operations & Disaster Intelligence
            </p>
          </div>
        </div>

        {/* EOC Core Telemetry: Active Incident, Mode, Data Status */}
        <div className="flex items-center space-x-3 text-[11px] font-mono shrink-0">
          {/* Active Incident Block */}
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-subtle-pulse"></span>
            <div>
              <div className="flex items-center space-x-1.5 text-[10px]">
                <span className="text-slate-400 font-bold uppercase">ACTIVE INCIDENT:</span>
                <span className="font-bold text-red-400">
                  {activePreset?.id === 'bengaluru' ? 'FLD-BLR-DEMO' : (activePreset?.id === 'emilia-romagna' ? 'FLD-EMR-2023' : 'FLD-ACTIVE-01')}
                </span>
              </div>
              <div className="text-[10px] text-slate-300 truncate max-w-[200px] xl:max-w-xs font-sans">
                {activePreset?.name || 'Bengaluru (Bellandur–Varthur & Outer Ring Road)'}
              </div>
            </div>
          </div>

          {/* Mode Indicator */}
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 flex items-center space-x-2">
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase block">OPERATIONAL MODE</span>
              <span className="text-[10px] font-bold text-amber-300">
                {activePreset?.id === 'bengaluru' ? 'DEMO — BENGALURU SCENARIO' : 'DEMO — HISTORICAL EVENT'}
              </span>
            </div>
          </div>

          {/* Provenance Data Status */}
          <div 
            className="hidden lg:flex px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 items-center space-x-2 cursor-pointer relative"
            onMouseEnter={() => setShowSatTooltip(true)}
            onMouseLeave={() => setShowSatTooltip(false)}
          >
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase block">DATA STATUS</span>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-300">
                <span className="text-blue-400">{activePreset?.id === 'bengaluru' ? 'Sentinel-1 / SAR Sim' : 'Sentinel-1'}</span>
                <span>•</span>
                <span className="text-emerald-400">Aerial CV</span>
                <span>•</span>
                <span className="text-amber-400">Simulated Reports</span>
              </div>
            </div>
            <Info className="w-3 h-3 text-slate-500" />

            {showSatTooltip && (
              <div className="absolute top-10 right-0 w-80 p-2.5 bg-slate-900 border border-slate-700 rounded shadow-2xl text-[10px] text-slate-200 z-50 leading-relaxed font-sans">
                <span className="font-bold text-amber-300 block mb-1 font-mono">DATA INTEGRITY DISCLOSURE</span>
                {activePreset?.id === 'bengaluru' 
                  ? 'Simulated flood inundation corridor modeled along Bellandur–Varthur lakes and Rajakaluve drainage. Ground verification uses aerial CV detections. Citizen SOS and resources calibrated for Bengaluru EOC demonstration.'
                  : 'Satellite imagery reflects Copernicus Sentinel-1 orbital radar acquisitions from May 2023. Ground verification uses computer-vision detections. Operational dispatch logs and citizen SOS reports are simulated for demonstration.'}
              </div>
            )}
          </div>
        </div>

        {/* Preset Selector & Operator Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Target Area Preset Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <select
              value={activePreset?.id || 'bengaluru'}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  onOpenCustomBounds();
                } else {
                  onSelectPreset(e.target.value);
                }
              }}
              aria-label="Target Area Preset"
              className="bg-transparent text-slate-200 focus:outline-none text-xs font-mono font-medium cursor-pointer"
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200 font-sans">
                  {p.name}
                </option>
              ))}
              <option value="custom" className="bg-slate-900 text-blue-300 font-semibold font-sans">
                + Manual Bounding Box...
              </option>
            </select>
          </div>

          {/* Demo Story Button */}
          <button
            onClick={onOpenDemoTour}
            className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/80 transition"
            title="Launch 15-Step Hackathon Presentation Story"
          >
            <PlayCircle className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">DEMO STORY</span>
          </button>

          {/* Generate Sitrep Button */}
          <button
            onClick={onOpenSitrep}
            className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Generate Situation Report"
          >
            <FileText className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">SITREP</span>
          </button>

          {/* FLOOD-X AI Assistant Button */}
          <button
            onClick={onOpenAi}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden md:inline">AI ASSISTANT</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs Bar */}
      <nav className="flex items-center space-x-0.5 px-2 py-0.5 overflow-x-auto scrollbar-none bg-[#0e1424] border-t border-command-border/40 font-mono text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-sm text-[11px] font-semibold tracking-wide whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-600/90 text-white border border-blue-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
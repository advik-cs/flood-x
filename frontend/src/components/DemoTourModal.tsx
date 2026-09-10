import React, { useState } from 'react';
import { 
  PlayCircle, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  Compass, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  onSelectPreset: (presetId: string) => void;
  onOpenSitrep: () => void;
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectPreset,
  onOpenSitrep
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: 'Open COMMAND CENTER',
      tab: 'command-center',
      summary: 'Inspect the Common Operating Picture (COP) with real-time status indicators (SYSTEM ONLINE, SATELLITE DATA, GIS ONLINE, AI ENGINE, INCIDENT NETWORK).',
      actionText: 'Go to Command Center',
      judgeNote: 'Notice the high information density, dark GIS palette, and explicit DEMO MODE data integrity badges.'
    },
    {
      step: 2,
      title: 'Select Bengaluru Flood Scenario — Demo',
      tab: 'command-center',
      action: () => onSelectPreset('bengaluru'),
      summary: 'Loads the Bengaluru Bellandur–Varthur lakes and Outer Ring Road drainage basin flood scenario. Corridor bounds and incident cluster auto-align.',
      actionText: 'Select Bengaluru Preset',
      judgeNote: 'Preset updates the AOI, basemap bounds, and local disaster entities in real time.'
    },
    {
      step: 3,
      title: 'Show Satellite Observation & SAR Metadata',
      tab: 'satellite',
      summary: 'View calibrated Sentinel-1 C-SAR observation (Mode IW, Polarization VV/VH, actual timestamp, descending orbit pass).',
      actionText: 'Open Satellite Analysis',
      judgeNote: 'Review the mandatory disclosure: Sentinel-1 provides periodic orbital passes, not continuous live video.'
    },
    {
      step: 4,
      title: 'Execute SAR Change Detection Pipeline',
      tab: 'satellite',
      summary: 'Run the 14-step backscatter change algorithm: ΔdB = 10 log10(post/pre), 3x3 speckle filter, water cutoff, and Minimum Mapping Unit (MMU).',
      actionText: 'Inspect SAR Pipeline',
      judgeNote: 'Toggle between SENSITIVE (-2.0 dB), STANDARD (-3.0 dB), and STRICT (-4.5 dB) presets.'
    },
    {
      step: 5,
      title: 'Analyze Calculated Flood Extent',
      tab: 'satellite',
      summary: 'Inspect calculated metrics: AOI Area (103.5 km²), Flooded Extent (~5.6 km²), and pixel histogram distribution.',
      actionText: 'Review Satellite Metrics',
      judgeNote: 'Real mathematical calculation, not hardcoded random numbers.'
    },
    {
      step: 6,
      title: 'Upload Aerial / Drone Imagery',
      tab: 'drone',
      summary: 'Switch to tactical reconnaissance. Load high-resolution optical drone frames over flooded residential sectors.',
      actionText: 'Open Aerial / Drone Studio',
      judgeNote: 'Supports JPG, PNG, and video frames.'
    },
    {
      step: 7,
      title: 'AI Computer Vision Detection',
      tab: 'drone',
      summary: 'Inspect neural detection bounding boxes for Stranded Persons (3), Submerged Vehicles (2), and Boats (1).',
      actionText: 'Review AI Bounding Boxes',
      judgeNote: 'Operator review: Click "RESCUE" to flag verified victims for emergency boat evacuation.'
    },
    {
      step: 8,
      title: 'Citizen SOS Crowdsourcing Intake',
      tab: 'incidents',
      summary: 'Observe incoming distress calls from trapped families and medical emergencies with exact GPS coordinates and affected counts.',
      actionText: 'Open Incidents & SOS Feed',
      judgeNote: 'Citizen reports immediately integrate into the spatial graph.'
    },
    {
      step: 9,
      title: 'Multi-Sensor Situation Fusion',
      tab: 'command-center',
      summary: 'The Fusion Engine fuses satellite flood boundaries, drone object counts, citizen SOS calls, and road blockage states.',
      actionText: 'View Fused Incidents',
      judgeNote: 'Spatially correlates multiple data streams into unified incident records (e.g. FLD-BLR-DEMO).'
    },
    {
      step: 10,
      title: 'Inspect Critical Incident: FLD-BLR-DEMO',
      tab: 'command-center',
      summary: 'Click on FLD-BLR-DEMO (Bellandur Flood Corridor & EcoSpace). Priority evaluated as CRITICAL (94/100).',
      actionText: 'Center on FLD-BLR-DEMO',
      judgeNote: 'Notice the live pulsing red marker on the GIS map.'
    },
    {
      step: 11,
      title: 'Explain Why FLD-BLR-DEMO Is Critical',
      tab: 'command-center',
      summary: 'Review transparent decision audit reasons: active SOS reports from EcoSpace mezzanine, stranded persons detected, Outer Ring Road blocked, transformer yard flooded.',
      actionText: 'Inspect Transparent Audit',
      judgeNote: 'Transparent decision intelligence — explainable priority scoring.'
    },
    {
      step: 12,
      title: 'Evaluate Available Rescue Fleet',
      tab: 'resources',
      summary: 'Inspect available rescue boats, all-terrain ambulances, and swift-water teams.',
      actionText: 'Open Resource Optimization',
      judgeNote: 'Weight sliders allow incident commanders to adjust response doctrine.'
    },
    {
      step: 13,
      title: 'Assign Nearest Resource & Obstacle Routing',
      tab: 'command-center',
      summary: 'Dispatcher recommends Vigili del Fuoco SAR Boat Alpha (22 km/h, 8 capacity). Compute detour avoiding submerged Via Renaccio.',
      actionText: 'Execute 1-Click Dispatch',
      judgeNote: 'Calculates dynamic obstacle-avoidance route on road graph.'
    },
    {
      step: 14,
      title: 'Generate AI Emergency Situation Report',
      tab: 'command-center',
      action: () => onOpenSitrep(),
      summary: 'Generate official ICS-compliant emergency SITREP compiling casualties, infrastructure impact, and action orders.',
      actionText: 'Generate SITREP Now',
      judgeNote: 'Mandatory disclosure: AI-generated decision support — human verification required.'
    },
    {
      step: 15,
      title: 'Post-Disaster Damage Assessment & Recovery',
      tab: 'damage',
      summary: 'Review classified structural damage across bridges, roads, and homes, followed by phased restoration sequencing.',
      actionText: 'View Damage Assessment',
      judgeNote: 'Completes the end-to-end 3-5 minute presentation lifecycle!'
    }
  ];

  const activeStepData = steps[currentStep - 1];

  const handleNext = () => {
    if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      const nextData = steps[nextStep - 1];
      if (nextData.tab) onNavigateTab(nextData.tab);
      if (nextData.action) nextData.action();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      const prevData = steps[prevStep - 1];
      if (prevData.tab) onNavigateTab(prevData.tab);
      if (prevData.action) prevData.action();
    }
  };

  const handleExecuteCurrent = () => {
    if (activeStepData.tab) onNavigateTab(activeStepData.tab);
    if (activeStepData.action) activeStepData.action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-command-surface border border-indigo-500/50 rounded-xl shadow-2xl flex flex-col font-mono text-xs overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-indigo-950/80 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PlayCircle className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="font-bold text-slate-100 text-sm">
                FLOOD-X HACKATHON PRESENTATION GUIDE
              </h2>
              <div className="text-[10px] text-indigo-300">
                15-Step Script for Smart India Hackathon 2026 Jury
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="p-3 bg-command-card/50 border-b border-command-border flex items-center justify-between text-[11px]">
          <span className="font-bold text-indigo-300">
            STEP {activeStepData.step} OF {steps.length}
          </span>
          <span className="text-slate-400">
            Target View: <b className="text-slate-200 uppercase">{activeStepData.tab}</b>
          </span>
        </div>

        {/* Content Card */}
        <div className="p-5 space-y-4 text-slate-200">
          <div>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-950 border border-indigo-800 text-indigo-300 uppercase">
              Section 30 Demo Story Step
            </span>
            <h3 className="text-base font-bold text-slate-100 mt-1.5">
              {activeStepData.title}
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {activeStepData.summary}
            </p>
          </div>

          {/* Judges Callout */}
          <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] space-y-1">
            <div className="font-bold text-indigo-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>KEY TALKING POINT FOR JURY:</span>
            </div>
            <p className="text-slate-300 italic leading-relaxed">
              "{activeStepData.judgeNote}"
            </p>
          </div>

          <button
            onClick={handleExecuteCurrent}
            className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow flex items-center justify-center space-x-2 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{activeStepData.actionText}</span>
          </button>
        </div>

        {/* Footer Navigation */}
        <div className="p-3 bg-slate-900 border-t border-command-border flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1 transition disabled:opacity-30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>PREVIOUS</span>
          </button>

          <span className="text-[10px] text-slate-400">
            Estimated Presentation Time: ~3-5 Minutes
          </span>

          <button
            onClick={handleNext}
            disabled={currentStep === steps.length}
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow flex items-center space-x-1 transition disabled:opacity-30"
          >
            <span>NEXT STEP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
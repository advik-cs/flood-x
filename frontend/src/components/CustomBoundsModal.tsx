import React, { useState } from 'react';
import { Compass, X, Check, MapPin } from 'lucide-react';
import { BoundingBox } from '../types/index.js';

interface CustomBoundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBounds: (bounds: BoundingBox) => void;
}

export const CustomBoundsModal: React.FC<CustomBoundsModalProps> = ({
  isOpen,
  onClose,
  onSubmitBounds
}) => {
  const [north, setNorth] = useState('44.60');
  const [south, setSouth] = useState('44.10');
  const [west, setWest] = useState('11.60');
  const [east, setEast] = useState('12.40');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const b: BoundingBox = {
      north: parseFloat(north),
      south: parseFloat(south),
      west: parseFloat(west),
      east: parseFloat(east)
    };

    if (isNaN(b.north) || isNaN(b.south) || isNaN(b.west) || isNaN(b.east)) {
      alert('Please enter valid numeric latitude and longitude coordinates.');
      return;
    }

    if (b.north <= b.south || b.east <= b.west) {
      alert('Invalid bounding box: North must be greater than South, and East must be greater than West.');
      return;
    }

    onSubmitBounds(b);
    onClose();
  };

  const handleSetIndiaPreset = () => {
    setNorth('35.7');
    setSouth('6.7');
    setWest('68.1');
    setEast('97.4');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-command-surface border border-command-border rounded-xl shadow-2xl flex flex-col font-mono text-xs overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-slate-900 border-b border-command-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-slate-100">
              MANUAL BOUNDING BOX (AOI) ENTRY
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Enter exact decimal degree coordinates to define the satellite processing envelope (AOI):
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-slate-300 block mb-1">North Latitude (°N):</label>
              <input
                type="text"
                value={north}
                onChange={(e) => setNorth(e.target.value)}
                placeholder="e.g. 35.7 or 44.60"
                className="w-full p-2 rounded bg-command-card border border-command-border text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 block mb-1">West Longitude (°E/W):</label>
                <input
                  type="text"
                  value={west}
                  onChange={(e) => setWest(e.target.value)}
                  placeholder="e.g. 68.1 or 11.60"
                  className="w-full p-2 rounded bg-command-card border border-command-border text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">East Longitude (°E/W):</label>
                <input
                  type="text"
                  value={east}
                  onChange={(e) => setEast(e.target.value)}
                  placeholder="e.g. 97.4 or 12.40"
                  className="w-full p-2 rounded bg-command-card border border-command-border text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">South Latitude (°N/S):</label>
              <input
                type="text"
                value={south}
                onChange={(e) => setSouth(e.target.value)}
                placeholder="e.g. 6.7 or 44.10"
                className="w-full p-2 rounded bg-command-card border border-command-border text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleSetIndiaPreset}
              className="text-[10px] text-blue-400 hover:underline"
            >
              Fill India National Bounds (N: 35.7, S: 6.7, W: 68.1, E: 97.4)
            </button>
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
            >
              CANCEL
            </button>

            <button
              type="submit"
              className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow"
            >
              SET AOI & UPDATE MAP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
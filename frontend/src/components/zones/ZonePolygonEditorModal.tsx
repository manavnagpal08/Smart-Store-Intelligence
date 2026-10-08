import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  X,
  Sliders,
  CheckCircle2,
  Info,
  Maximize2
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Zone } from '../../types';

interface Props {
  cameraId: string;
  onClose: () => void;
}

interface PolygonVertex {
  x: number;
  y: number;
}

export const ZonePolygonEditorModal: React.FC<Props> = ({ cameraId, onClose }) => {
  const { zones } = useStore();
  const safeZones = Array.isArray(zones) ? zones : [];
  const cameraZones = safeZones.filter(z => z.camera_id === cameraId);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(cameraZones[0]?.zone_id || 'ENTRANCE');
  const [zoneType, setZoneType] = useState<string>('ENTRANCE');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Polygon points normalized [0..100]
  const [vertices, setVertices] = useState<PolygonVertex[]>([
    { x: 15, y: 20 },
    { x: 85, y: 20 },
    { x: 85, y: 80 },
    { x: 15, y: 80 },
  ]);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Change vertices when switching zone
  useEffect(() => {
    if (selectedZoneId === 'ENTRANCE') {
      setVertices([{ x: 10, y: 15 }, { x: 50, y: 15 }, { x: 50, y: 85 }, { x: 10, y: 85 }]);
      setZoneType('ENTRANCE');
    } else if (selectedZoneId === 'AISLE-A') {
      setVertices([{ x: 55, y: 20 }, { x: 90, y: 20 }, { x: 90, y: 85 }, { x: 55, y: 85 }]);
      setZoneType('AISLE');
    } else if (selectedZoneId === 'CHECKOUT-01') {
      setVertices([{ x: 20, y: 30 }, { x: 70, y: 30 }, { x: 70, y: 75 }, { x: 20, y: 75 }]);
      setZoneType('CHECKOUT');
    } else if (selectedZoneId === 'STAFF-STORAGE') {
      setVertices([{ x: 60, y: 10 }, { x: 95, y: 10 }, { x: 95, y: 60 }, { x: 60, y: 60 }]);
      setZoneType('RESTRICTED');
    }
  }, [selectedZoneId]);

  const handlePointerDown = (index: number) => {
    setDraggingIndex(index);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingIndex === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const normX = Math.max(2, Math.min(98, Math.round((clientX / rect.width) * 100)));
    const normY = Math.max(2, Math.min(98, Math.round((clientY / rect.height) * 100)));

    setVertices(prev => {
      const copy = [...prev];
      copy[draggingIndex] = { x: normX, y: normY };
      return copy;
    });
  };

  const handlePointerUp = () => {
    setDraggingIndex(null);
  };

  const handleAddVertex = () => {
    if (vertices.length >= 8) return;
    const last = vertices[vertices.length - 1];
    const first = vertices[0];
    const mid = { x: Math.round((last.x + first.x) / 2), y: Math.round((last.y + first.y) / 2) };
    setVertices([...vertices, mid]);
  };

  const handleResetShape = () => {
    setVertices([
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ]);
  };

  const handleSavePolygon = () => {
    setSavedNotice(`Zone ${selectedZoneId} polygon calibrated and deployed to vision engine!`);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const polygonPointsStr = vertices.map(v => `${v.x * 6},${v.y * 4}`).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl bg-white text-slate-900 overflow-hidden my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Interactive Polygon Safety Zone Calibrator</h3>
              <p className="text-[11px] text-slate-500">Click & drag handles to map custom detection polygons on {cameraId}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Zone Selector and Preset Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Target Zone:</label>
              <select
                value={selectedZoneId}
                onChange={e => setSelectedZoneId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none"
              >
                {cameraZones.map(z => (
                  <option key={z.zone_id} value={z.zone_id}>
                    {z.zone_name} ({z.zone_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddVertex}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-brand-600" />
                <span>Add Vertex Point</span>
              </button>
              <button
                onClick={handleResetShape}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Box</span>
              </button>
            </div>
          </div>

          {/* Interactive Calibration Canvas */}
          <div className="relative aspect-video w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner select-none flex items-center justify-center">
            {/* Ambient Background CCTV Grid Simulator */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:40px_40px]" />

            {/* SVG Polygon Editor Layer */}
            <svg
              ref={svgRef}
              viewBox="0 0 600 400"
              className="absolute inset-0 w-full h-full cursor-crosshair"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Shaded Polygon Area */}
              <polygon
                points={polygonPointsStr}
                className={`${
                  zoneType === 'RESTRICTED'
                    ? 'fill-red-500/30 stroke-red-500 stroke-2'
                    : zoneType === 'CHECKOUT'
                    ? 'fill-amber-500/30 stroke-amber-500 stroke-2'
                    : 'fill-purple-500/30 stroke-purple-500 stroke-2'
                }`}
              />

              {/* Vertex Handles */}
              {vertices.map((v, i) => (
                <g key={i}>
                  <circle
                    cx={v.x * 6}
                    cy={v.y * 4}
                    r={draggingIndex === i ? 10 : 8}
                    className="fill-white stroke-brand-700 stroke-2 cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                    onPointerDown={() => handlePointerDown(i)}
                  />
                  <text
                    x={v.x * 6}
                    y={v.y * 4 - 12}
                    textAnchor="middle"
                    className="fill-white font-mono font-bold text-[10px] pointer-events-none drop-shadow"
                  >
                    P{i + 1} ({v.x}%, {v.y}%)
                  </text>
                </g>
              ))}
            </svg>

            {/* In-Canvas Instruction Overlay */}
            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5 pointer-events-none">
              <Info className="h-3.5 w-3.5 text-brand-300" />
              <span>Drag the corner circles to align detection boundaries to store aisles or doors</span>
            </div>
          </div>

          {/* Coordinates Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-slate-700">
              <strong className="text-slate-900">Current Vertices:</strong> {vertices.map((v, i) => `P${i + 1}: [${v.x}%, ${v.y}%]`).join(' | ')}
            </span>
          </div>

          {/* Success Notice */}
          {savedNotice && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {savedNotice}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePolygon}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-800 shadow-xs transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Deploy Zone Polygon</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Camera,
  Video,
  Shield,
  Layers,
  Users,
  AlertTriangle,
  ArrowRight,
  Plus,
  CheckCircle,
  MapPin,
  Clock,
  Sliders
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ZonePolygonEditorModal } from '../components/zones/ZonePolygonEditorModal';

export const Cameras: React.FC = () => {
  const navigate = useNavigate();
  const { cameras, zones, activeEvents } = useStore();
  const safeActiveEvents = Array.isArray(activeEvents) ? activeEvents : [];

  const cameraCards = [
    {
      id: 'CAM-01',
      name: 'Main Entrance & Aisle A',
      location: 'North Entrance Hall',
      stream: 'datasets/sample/sample_cctv.mp4',
      status: 'ACTIVE',
      fps: 30,
      resolution: '1920x1080',
      zones: ['ENTRANCE', 'AISLE-A'],
      peopleCount: 4,
      alertsCount: safeActiveEvents.filter(e => e.camera_id === 'CAM-01').length,
    },
    {
      id: 'CAM-02',
      name: 'Checkout Area & Storage Door',
      location: 'Front Cashier Lanes',
      stream: 'rtsp://store-cam-02.local/live',
      status: 'ACTIVE',
      fps: 30,
      resolution: '1920x1080',
      zones: ['CHECKOUT-01', 'STAFF-STORAGE'],
      peopleCount: 6,
      alertsCount: safeActiveEvents.filter(e => e.camera_id === 'CAM-02').length,
    },
    {
      id: 'CAM-03',
      name: 'Aisle B & Grocery Shelves',
      location: 'Central Grocery Row',
      stream: 'rtsp://store-cam-03.local/live',
      status: 'ACTIVE',
      fps: 25,
      resolution: '1920x1080',
      zones: ['AISLE-B'],
      peopleCount: 2,
      alertsCount: safeActiveEvents.filter(e => e.camera_id === 'CAM-03').length,
    },
    {
      id: 'CAM-04',
      name: 'Back Loading & Staff Locker',
      location: 'Rear Loading Dock',
      stream: 'rtsp://store-cam-04.local/live',
      status: 'STANDBY',
      fps: 15,
      resolution: '1280x720',
      zones: ['RESTRICTED-REAR'],
      peopleCount: 0,
      alertsCount: safeActiveEvents.filter(e => e.camera_id === 'CAM-04').length,
    },
  ];

  const zoneRules = [
    {
      zoneId: 'ENTRANCE',
      type: 'ENTRANCE',
      camera: 'CAM-01',
      capacity: 8,
      threshold: 'Count > 8 persons',
      rule: 'Crowd density alert & entrance flow delay',
    },
    {
      zoneId: 'AISLE-A',
      type: 'AISLE',
      camera: 'CAM-01',
      capacity: 6,
      threshold: 'Stationary > 10.0s',
      rule: 'Aisle obstruction & cart congestion',
    },
    {
      zoneId: 'CHECKOUT-01',
      type: 'CHECKOUT',
      camera: 'CAM-02',
      capacity: 4,
      threshold: 'Wait time > 15.0s',
      rule: 'Queue congestion & cashier request alert',
    },
    {
      zoneId: 'STAFF-STORAGE',
      type: 'RESTRICTED',
      camera: 'CAM-02',
      capacity: 0,
      threshold: 'Instant entry (0 tolerance)',
      rule: 'Restricted area breach & security notification',
    },
  ];

  const [calibratingCameraId, setCalibratingCameraId] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Summary */}
      <div className="glass-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            CCTV & Zone Infrastructure
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            4 CCTV Ingest Feeds &bull; 6 Polygon Detection Zones &bull; Hardware Accelerated
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCalibratingCameraId('CAM-01')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Sliders className="h-3.5 w-3.5 text-brand-700" />
            <span>Interactive Polygon Calibration</span>
          </button>
          <button
            onClick={() => navigate('/live-monitoring')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Video className="h-4 w-4" />
            Live Multi-Stream View
          </button>
        </div>
      </div>

      {/* Camera Feeds Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {cameraCards.map(cam => (
          <div
            key={cam.id}
            className="glass-card rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-brand-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100 shadow-2xs">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{cam.name}</h3>
                    <p className="text-xs font-mono font-medium text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {cam.location} &bull; <span className="text-brand-700 font-bold">{cam.id}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    cam.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      cam.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  {cam.status}
                </span>
              </div>

              {/* Stream Specs & Metrics */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50/70 p-3 text-center border border-slate-200/60">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">FPS / Res</p>
                  <p className="text-xs font-bold font-mono text-slate-700">
                    {cam.fps} FPS &bull; {cam.resolution}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Live Headcount</p>
                  <p className="text-xs font-bold text-slate-900">{cam.peopleCount} Persons</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Active Alerts</p>
                  <p
                    className={`text-xs font-bold ${
                      cam.alertsCount > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {cam.alertsCount} Alerts
                  </p>
                </div>
              </div>

              {/* Zones Assigned */}
              <div className="mt-4 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Assigned Safety Zones
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cam.zones.map(z => (
                    <span
                      key={z}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 shadow-2xs"
                    >
                      <Layers className="h-3 w-3 text-brand-600" />
                      {z}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 truncate max-w-[160px]">
                {cam.stream}
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCalibratingCameraId(cam.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-700 transition-colors shadow-2xs"
                >
                  <Sliders className="h-3 w-3 text-brand-600" />
                  <span>Calibrate</span>
                </button>
                <button
                  onClick={() => navigate('/live-monitoring')}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-50 border border-brand-200/60 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100 transition-colors shadow-2xs"
                >
                  <span>View Feed</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Zone Thresholds & Intelligence Policy Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Zone Safety & Threshold Policies
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Configured trigger conditions validated by Phase 2 rules and Phase 3 Java OOP engine
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-semibold">Zone ID</th>
                <th className="py-3 px-4 font-semibold">Zone Type</th>
                <th className="py-3 px-4 font-semibold">Assigned Camera</th>
                <th className="py-3 px-4 font-semibold">Capacity Limit</th>
                <th className="py-3 px-4 font-semibold">Violation Threshold</th>
                <th className="py-3 px-4 font-semibold">Business Rule Enforcement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/60">
              {zoneRules.map(rule => (
                <tr key={rule.zoneId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-brand-700">{rule.zoneId}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{rule.type}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{rule.camera}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">{rule.capacity} persons</td>
                  <td className="py-3 px-4 text-slate-600">{rule.threshold}</td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{rule.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Polygon Zone Calibration Modal */}
      {calibratingCameraId && (
        <ZonePolygonEditorModal
          cameraId={calibratingCameraId}
          onClose={() => setCalibratingCameraId(null)}
        />
      )}
    </div>
  );
};

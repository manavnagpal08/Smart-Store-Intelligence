import React from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

export const Cameras: React.FC = () => {
  const navigate = useNavigate();
  const { cameras, zones, activeEvents } = useStore();
  const safeActiveEvents = Array.isArray(activeEvents) ? activeEvents : [];

  const cameraCards = cameras.map(camera => ({
    id: camera.camera_id,
    name: camera.camera_name,
    location: camera.location || 'Location not configured',
    stream: camera.stream_source || 'Stream source not configured',
    status: camera.status || 'UNKNOWN',
    configured: Boolean(camera.stream_source),
    fps: null as number | null,
    resolution: null as string | null,
    zones: zones.filter(zone => zone.camera_id === camera.camera_id).map(zone => zone.zone_id),
    peopleCount: null as number | null,
    alertsCount: safeActiveEvents.filter(event => event.camera_id === camera.camera_id).length,
  }));

  const zoneRules = zones.map(zone => ({
    zoneId: zone.zone_id,
    type: zone.zone_type,
    camera: zone.camera_id || 'UNASSIGNED',
    capacity: 'Not configured',
    threshold: 'Not configured',
    rule: zone.description || 'No policy description configured',
  }));


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Summary */}
      <div className="glass-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            CCTV & Zone Infrastructure
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {cameras.length} registered camera{cameras.length === 1 ? '' : 's'} &bull; {zones.length} configured zone{zones.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                    cam.status === 'ACTIVE' && cam.configured
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      cam.status === 'ACTIVE' && cam.configured ? 'bg-sky-500' : 'bg-slate-400'
                    }`}
                  />
                  {cam.status === 'ACTIVE' && cam.configured ? 'CONFIGURED' : cam.status}
                </span>
              </div>

              {/* Stream Specs & Metrics */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50/70 p-3 text-center border border-slate-200/60">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">FPS / Res</p>
                  <p className="text-xs font-bold font-mono text-slate-700">
                    {cam.fps === null ? 'Not reported' : `${cam.fps} FPS • ${cam.resolution || 'Unknown'}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Live Headcount</p>
                  <p className="text-xs font-bold text-slate-900">{cam.peopleCount === null ? 'Not reported' : `${cam.peopleCount} Persons`}</p>
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
                  <td className="py-3 px-4 font-medium text-slate-700">{rule.capacity}</td>
                  <td className="py-3 px-4 text-slate-600">{rule.threshold}</td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{rule.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Users,
  Clock,
  Camera,
  Ban,
  ArrowRight,
  Eye,
  TrendingUp,
  FileText,
  Mic,
  Radio
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useStore } from '../context/StoreContext';
import { MetricCard } from '../components/common/MetricCard';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { EmptyState } from '../components/common/EmptyState';
import { PanicLockdownBanner } from '../components/common/PanicLockdownBanner';
import { AuditDossierModal } from '../components/modals/AuditDossierModal';
import { VoicePADispatcherModal } from '../components/common/VoicePADispatcherModal';
import { WebhookManagerModal } from '../components/modals/WebhookManagerModal';
import { formatDateTime, formatTimeAgo, formatEventType } from '../utils/formatters';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { events, activeEvents, cameras, zones, isLoading, error, refreshData, setSelectedEvent } =
    useStore();

  const [isLockdown, setIsLockdown] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [showWebhookModal, setShowWebhookModal] = useState<boolean>(false);

  const safeEvents = Array.isArray(events) ? events : [];
  const safeActiveEvents = Array.isArray(activeEvents) ? activeEvents : [];

  if (isLoading && safeEvents.length === 0) {
    return <LoadingSpinner message="Connecting to Vision Intelligence Engine..." />;
  }

  // Calculate KPIs
  const criticalAlerts = safeActiveEvents.filter(e => e.severity === 'CRITICAL');
  const highAlerts = safeActiveEvents.filter(e => e.severity === 'HIGH');
  const restrictedBreaches = safeEvents.filter(e => e.event_type === 'RESTRICTED_AREA_ENTRY');
  const queueCongestions = safeEvents.filter(e => e.event_type === 'QUEUE_CONGESTION');
  const crowdAlerts = safeEvents.filter(e => e.event_type === 'CROWD_DENSITY');

  // Overall Safety Status
  const storeStatus = isLockdown
    ? { label: 'EMERGENCY LOCKDOWN PROTOCOL ARMED', color: 'bg-red-600 text-white', status: 'critical' }
    : criticalAlerts.length > 0
    ? { label: 'CRITICAL ATTENTION REQUIRED', color: 'bg-red-500 text-white', status: 'critical' }
    : activeEvents.length > 0
    ? { label: 'ELEVATED ACTIVITY - MONITORING', color: 'bg-amber-500 text-white', status: 'warning' }
    : { label: 'ALL ZONES SAFE & OPTIMAL', color: 'bg-emerald-600 text-white', status: 'healthy' };

  // Calculate Zone Occupancy Chart Data
  const zoneChartData = [
    { name: 'Entrance', count: 4, capacity: 8, zoneId: 'ENTRANCE' },
    { name: 'Aisle A (Snacks)', count: 3, capacity: 6, zoneId: 'AISLE-A' },
    { name: 'Aisle B (Beverages)', count: 5, capacity: 6, zoneId: 'AISLE-B' },
    { name: 'Checkout 1', count: 6, capacity: 4, zoneId: 'CHECKOUT-01' },
    { name: 'Checkout 2', count: 2, capacity: 4, zoneId: 'CHECKOUT-02' },
    { name: 'Staff Storage', count: isLockdown ? 1 : 0, capacity: 0, zoneId: 'STAFF-STORAGE' },
  ];

  const recentIncidents = events.slice(0, 7);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {error && <ErrorBanner message={error} onRetry={refreshData} />}

      {/* Emergency Lockdown Action Banner */}
      <PanicLockdownBanner
        isLockdown={isLockdown}
        onToggleLockdown={() => setIsLockdown(!isLockdown)}
      />

      {/* Top Store Operational Status Banner */}
      <div className="glass-panel flex flex-wrap items-center justify-between p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center space-x-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs ${
              storeStatus.status === 'critical'
                ? 'bg-red-600 text-white animate-pulse'
                : storeStatus.status === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Store Safety Status
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  storeStatus.status === 'critical'
                    ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
                    : storeStatus.status === 'warning'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {storeStatus.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">
              {isLockdown
                ? 'Floor locked down. Siren sounding and all exits alerted.'
                : activeEvents.length === 0
                ? 'All safety parameters within operational compliance. Computer vision streams active.'
                : `${activeEvents.length} active incident${
                    activeEvents.length > 1 ? 's' : ''
                  } tracked on floor (${criticalAlerts.length} Critical, ${highAlerts.length} High).`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0">
          <button
            onClick={() => setShowVoiceModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Mic className="h-3.5 w-3.5 text-brand-700" />
            <span>Floor PA Intercom</span>
          </button>
          <button
            onClick={() => setShowAuditModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" />
            <span>Audit Dossier</span>
          </button>
          <button
            onClick={() => setShowWebhookModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Radio className="h-3.5 w-3.5 text-blue-600" />
            <span>Webhooks</span>
          </button>
          <button
            onClick={() => navigate('/live-monitoring')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            Live CCTV Feeds
          </button>
        </div>
      </div>

      {/* 6 Key Operational Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Active Alerts"
          value={activeEvents.length}
          subtitle={`${criticalAlerts.length} Critical`}
          icon={AlertTriangle}
          accentColor={activeEvents.length > 0 ? (criticalAlerts.length > 0 ? 'red' : 'amber') : 'emerald'}
          onClick={() => navigate('/alerts')}
        />
        <MetricCard
          title="Total Events"
          value={events.length}
          subtitle="Processed by Engine"
          icon={TrendingUp}
          accentColor="purple"
          onClick={() => navigate('/alerts')}
        />
        <MetricCard
          title="Restricted Breaches"
          value={restrictedBreaches.length}
          subtitle="Vault / Storage Area"
          icon={Ban}
          accentColor="burgundy"
          onClick={() => navigate('/alerts')}
        />
        <MetricCard
          title="Queue Congestions"
          value={queueCongestions.length}
          subtitle="Checkout Delay Spikes"
          icon={Clock}
          accentColor="amber"
          onClick={() => navigate('/alerts')}
        />
        <MetricCard
          title="Crowd Density"
          value={crowdAlerts.length}
          subtitle="Aisle Capacity Events"
          icon={Users}
          accentColor="blue"
          onClick={() => navigate('/alerts')}
        />
        <MetricCard
          title="Active Cameras"
          value={cameras.length || 4}
          subtitle="Edge Ingest Feeds"
          icon={Camera}
          accentColor="emerald"
          onClick={() => navigate('/cameras')}
        />
      </div>

      {/* Camera Matrix Ingest Grid (4-up live feeds) */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Live CCTV Camera Matrix
              </h2>
              <p className="text-xs text-slate-500">Real-time edge streams with polygon safety overlay</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/live-monitoring')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <span>Full Monitor Studio</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              id: 'CAM-01',
              name: 'North Entrance & Aisle A',
              location: 'North Entry Hallway',
              zone: 'ENTRANCE (Aisle A)',
              status: 'ONLINE',
              fps: '30 FPS',
              count: 4,
              color: 'border-purple-200 bg-purple-50/20'
            },
            {
              id: 'CAM-02',
              name: 'Checkout & Cashier Quad',
              location: 'Front Cashier Lanes',
              zone: 'CHECKOUT-01 (Lanes)',
              status: 'ONLINE',
              fps: '30 FPS',
              count: 6,
              color: 'border-amber-200 bg-amber-50/20'
            },
            {
              id: 'CAM-03',
              name: 'Snack & Grocery Aisles',
              location: 'Center Merchandise Rows',
              zone: 'AISLE-B (Shelves)',
              status: 'ONLINE',
              fps: '25 FPS',
              count: 2,
              color: 'border-blue-200 bg-blue-50/20'
            },
            {
              id: 'CAM-04',
              name: 'Restricted Back Vault',
              location: 'High-Value Storage',
              zone: 'STAFF-STORAGE (Vault)',
              status: isLockdown ? 'ALERT' : 'SECURED',
              fps: '15 FPS',
              count: isLockdown ? 1 : 0,
              color: isLockdown ? 'border-red-300 bg-red-50/30 animate-pulse' : 'border-emerald-200 bg-emerald-50/20'
            },
          ].map(cam => (
            <div
              key={cam.id}
              onClick={() => navigate('/live-monitoring')}
              className={`rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${cam.color} bg-white`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-slate-900">{cam.id}</span>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {cam.fps}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{cam.name}</h4>
              <p className="text-[11px] text-slate-500 line-clamp-1 mb-3">{cam.location}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                <span className="text-slate-500 font-medium">{cam.zone}</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Users className="h-3 w-3 text-slate-400" />
                  {cam.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Section: Active Alerts Priority List & Live Zone Occupancy */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Active Alerts Priority List (7 cols) */}
        <div className="glass-panel p-5 lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Active Priority Alerts
              </h2>
              <p className="text-xs text-slate-500">Real-time store floor safety events</p>
            </div>
            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
              {activeEvents.length} Active
            </span>
          </div>

          {activeEvents.length === 0 ? (
            <EmptyState
              title="No Active Alerts"
              description="Store operations are flowing nominally with zero safety breaches."
            />
          ) : (
            <div className="space-y-3">
              {activeEvents.slice(0, 4).map(event => (
                <div
                  key={event.event_id}
                  onClick={() => setSelectedEvent(event)}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/70 p-3.5 hover:bg-white hover:border-brand-300 hover:shadow-xs cursor-pointer transition-all duration-150"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <SeverityBadge severity={event.severity} size="sm" />
                      <span className="text-xs font-bold text-slate-900">
                        {formatEventType(event.event_type)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {event.description || `Detected at ${event.zone_id || event.camera_id}`}
                    </p>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-600">
                      <span className="font-mono font-semibold text-slate-700">{event.camera_id}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-slate-700">{event.zone_id || 'GENERAL'}</span>
                      <span>&bull;</span>
                      <span>{formatTimeAgo(event.timestamp)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-brand-700 hover:border-brand-300 transition-colors shadow-2xs"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeEvents.length > 4 && (
            <button
              onClick={() => navigate('/alerts')}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/60 py-2 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
            >
              <span>View all {activeEvents.length} active alerts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Live Zone Occupancy Chart (5 cols) */}
        <div className="glass-panel p-5 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Zone Occupancy vs. Capacity
                </h2>
                <p className="text-xs text-slate-500">Live headcounts across polygon retail zones</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">Live Headcounts</span>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 10]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="People Count" radius={[4, 4, 0, 0]}>
                    {zoneChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.zoneId === 'STAFF-STORAGE' && entry.count > 0
                            ? '#dc2626'
                            : entry.count > entry.capacity
                            ? '#d97706'
                            : '#7e22ce'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-600" /> Normal Occupancy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Over Capacity
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-600" /> Restricted Area
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Incident Event Log */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Recent Store Incidents Feed
            </h2>
            <p className="text-xs text-slate-500">Audit trail of verified CV safety events</p>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
          >
            <span>Full History</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentIncidents.length === 0 ? (
          <EmptyState title="No Recorded Incidents" description="Events will appear here as CV pipeline processes CCTV streams." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Severity</th>
                  <th className="pb-3 font-semibold">Incident Type</th>
                  <th className="pb-3 font-semibold">Camera / Zone</th>
                  <th className="pb-3 font-semibold">Detected At</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentIncidents.map(event => (
                  <tr
                    key={event.event_id}
                    onClick={() => setSelectedEvent(event)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3">
                      <SeverityBadge severity={event.severity} size="sm" />
                    </td>
                    <td className="py-3 font-semibold text-slate-800">
                      {formatEventType(event.event_type)}
                    </td>
                    <td className="py-3">
                      <span className="font-mono font-medium text-slate-700">{event.camera_id}</span>
                      <span className="text-slate-400 mx-1">&bull;</span>
                      <span className="font-mono text-slate-500">{event.zone_id || 'STORE-WIDE'}</span>
                    </td>
                    <td className="py-3 text-slate-500">{formatDateTime(event.timestamp)}</td>
                    <td className="py-3">
                      <StatusBadge status={event.status} size="sm" />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:text-brand-700 hover:border-brand-300 transition-colors shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Dossier Modal */}
      {showAuditModal && <AuditDossierModal onClose={() => setShowAuditModal(false)} />}

      {/* Voice Floor PA Modal */}
      {showVoiceModal && <VoicePADispatcherModal onClose={() => setShowVoiceModal(false)} />}

      {/* Webhook Manager Modal */}
      {showWebhookModal && <WebhookManagerModal onClose={() => setShowWebhookModal(false)} />}
    </div>
  );
};

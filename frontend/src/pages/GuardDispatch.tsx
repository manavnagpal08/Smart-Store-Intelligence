import React, { useState, useEffect } from 'react';
import {
  Shield,
  Radio,
  UserCheck,
  AlertTriangle,
  Clock,
  PhoneCall,
  Volume2,
  CheckCircle2,
  Navigation,
  Activity,
  Send,
  Battery,
  MapPin,
  RefreshCw,
  BellRing,
  Flame,
  Zap,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { GuardUnit, StoreEvent } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDateTime, formatEventType } from '../utils/formatters';

export const GuardDispatch: React.FC = () => {
  const { activeEvents, events, updateEventStatus } = useStore();

  const [guards, setGuards] = useState<GuardUnit[]>([
    {
      id: 'GUARD-01',
      name: 'Officer Alex Ramirez',
      badge: 'SEC-8821',
      zone_assigned: 'CHECKOUT-01',
      status: 'PATROL',
      battery: 92,
      last_ping: 'Just now',
      assigned_incident_id: null,
      phone: '+1 (555) 019-4821',
    },
    {
      id: 'GUARD-02',
      name: 'Officer Marcus Vance',
      badge: 'SEC-4419',
      zone_assigned: 'AISLE-A',
      status: 'PATROL',
      battery: 78,
      last_ping: '1m ago',
      assigned_incident_id: null,
      phone: '+1 (555) 019-4822',
    },
    {
      id: 'GUARD-03',
      name: 'Officer Elena Rostova',
      badge: 'SEC-9102',
      zone_assigned: 'ENTRANCE',
      status: 'STANDBY',
      battery: 85,
      last_ping: 'Just now',
      assigned_incident_id: null,
      phone: '+1 (555) 019-4823',
    },
    {
      id: 'GUARD-04',
      name: 'Supervisor David Chen',
      badge: 'SEC-1001',
      zone_assigned: 'RESTRICTED',
      status: 'PATROL',
      battery: 95,
      last_ping: 'Just now',
      assigned_incident_id: null,
      phone: '+1 (555) 019-4820',
    },
  ]);

  const [dispatchLogs, setDispatchLogs] = useState<Array<{ id: string; time: string; text: string; type: 'DISPATCH' | 'RESOLVE' | 'BROADCAST' }>>([
    { id: 'LOG-1', time: '10:14 AM', text: 'Officer Ramirez acknowledged checkout lane queue congestion alert.', type: 'DISPATCH' },
    { id: 'LOG-2', time: '09:50 AM', text: 'Officer Vance completed perimeter patrol scan on Aisle A.', type: 'RESOLVE' },
    { id: 'LOG-3', time: '09:30 AM', text: 'Storewide automated visual PA warning test completed successfully.', type: 'BROADCAST' },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<StoreEvent | null>(null);
  const [selectedGuardId, setSelectedGuardId] = useState<string>('GUARD-01');
  const [paBroadcastMessage, setPaBroadcastMessage] = useState<string>('Attention store security: Please report to designated patrol zone.');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDispatch = (guardId: string, event: StoreEvent) => {
    setGuards(prev =>
      prev.map(g =>
        g.id === guardId
          ? { ...g, status: 'RESPONDING', assigned_incident_id: event.event_id, zone_assigned: event.zone_id || g.zone_assigned }
          : g
      )
    );

    const guard = guards.find(g => g.id === guardId);
    const newLog = {
      id: `LOG-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Tactical Dispatch: ${guard?.name || guardId} dispatched to ${event.zone_id || 'incident area'} for ${formatEventType(event.event_type)} (${event.event_id}).`,
      type: 'DISPATCH' as const,
    };
    setDispatchLogs(prev => [newLog, ...prev]);
    showToast(`Dispatched ${guard?.name} to Incident ${event.event_id}`);
    updateEventStatus(event.event_id, 'ACKNOWLEDGED');
  };

  const handleResolveGuardAssignment = (guardId: string) => {
    const guard = guards.find(g => g.id === guardId);
    if (guard?.assigned_incident_id) {
      updateEventStatus(guard.assigned_incident_id, 'RESOLVED');
    }

    setGuards(prev =>
      prev.map(g =>
        g.id === guardId
          ? { ...g, status: 'PATROL', assigned_incident_id: null }
          : g
      )
    );

    const newLog = {
      id: `LOG-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `${guard?.name || guardId} marked incident resolved and returned to active patrol.`,
      type: 'RESOLVE' as const,
    };
    setDispatchLogs(prev => [newLog, ...prev]);
    showToast(`${guard?.name} returned to Patrol.`);
  };

  const triggerPABroadcast = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(paBroadcastMessage);
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    }
    const newLog = {
      id: `LOG-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Overhead PA Broadcast: "${paBroadcastMessage}"`,
      type: 'BROADCAST' as const,
    };
    setDispatchLogs(prev => [newLog, ...prev]);
    showToast('Voice PA Announcement Broadcasted.');
  };

  const highPriorityEvents = activeEvents.filter(
    e => e.severity === 'CRITICAL' || e.severity === 'HIGH' || e.status === 'ACTIVE'
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center space-x-3 text-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <Radio className="h-6 w-6 text-blue-600 animate-pulse" />
            <h1 className="text-xl font-bold text-slate-900">Security Personnel & Tactical Dispatch</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time guard coordination, incident dispatch SLA tracking, and storewide PA intercom control
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => showToast('Guard GPS telemetry refreshed.')}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Radio Pings</span>
          </button>
        </div>
      </div>

      {/* On-Duty Guard Units Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span>Active On-Duty Security Personnel ({guards.length})</span>
          </h2>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            All Units Online & Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {guards.map(guard => {
            const isResponding = guard.status === 'RESPONDING';
            return (
              <div
                key={guard.id}
                className={`bg-white rounded-xl border p-4 shadow-xs flex flex-col justify-between transition ${
                  isResponding
                    ? 'border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{guard.name}</h4>
                      <span className="text-[10px] font-mono text-slate-500">{guard.badge}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isResponding
                          ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-200'
                          : guard.status === 'PATROL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {guard.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1 text-slate-500">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>Zone:</span>
                      </span>
                      <span className="font-semibold text-slate-800">{guard.zone_assigned}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1 text-slate-500">
                        <Battery className="h-3 w-3 text-slate-400" />
                        <span>Radio:</span>
                      </span>
                      <span className="font-semibold text-emerald-600">{guard.battery}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1 text-slate-500">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>Ping:</span>
                      </span>
                      <span className="text-slate-500 font-mono">{guard.last_ping}</span>
                    </div>
                  </div>

                  {isResponding && guard.assigned_incident_id && (
                    <div className="mt-3 p-2 bg-rose-100/60 rounded-lg border border-rose-200 text-[10px] text-rose-800 font-medium">
                      Responding to: <span className="font-mono font-bold">{guard.assigned_incident_id}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  {isResponding ? (
                    <button
                      onClick={() => handleResolveGuardAssignment(guard.id)}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Resolve & Return</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <a
                        href={`tel:${guard.phone}`}
                        className="flex-1 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1"
                      >
                        <PhoneCall className="h-3 w-3 text-slate-500" />
                        <span>Call Unit</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split: Active Incidents Dispatch Board & PA Broadcast Intercom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Incidents Dispatch Queue (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Dispatch Queue ({highPriorityEvents.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">SLA TARGET: &lt; 90 SECONDS</span>
            </div>

            {highPriorityEvents.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800">All Operations Normal</h4>
                <p className="text-xs text-slate-500 mt-1">No outstanding high-priority security incidents require dispatch.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {highPriorityEvents.map(evt => {
                  const assignedGuard = guards.find(g => g.assigned_incident_id === evt.event_id);

                  return (
                    <div key={evt.event_id} className="p-4 px-6 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2">
                          <SeverityBadge severity={evt.severity} />
                          <h4 className="text-xs font-bold text-slate-900">
                            {formatEventType(evt.event_type)}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            {evt.event_id}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-1">
                          {evt.description || 'Automated visual detection alert triggered on live camera.'}
                        </p>

                        <div className="flex items-center space-x-4 text-[11px] text-slate-500">
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span className="font-semibold text-slate-700">{evt.zone_id || 'MAIN_SALES'}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{formatDateTime(evt.timestamp)}</span>
                          </span>
                          {assignedGuard && (
                            <span className="text-rose-600 font-semibold font-mono">
                              Assigned: {assignedGuard.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {assignedGuard ? (
                          <button
                            onClick={() => handleResolveGuardAssignment(assignedGuard.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center space-x-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <select
                              value={selectedGuardId}
                              onChange={e => setSelectedGuardId(e.target.value)}
                              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
                            >
                              {guards.filter(g => g.status !== 'RESPONDING').map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.name} ({g.zone_assigned})
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleDispatch(selectedGuardId, evt)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center space-x-1"
                            >
                              <Send className="h-3.5 w-3.5 text-blue-400" />
                              <span>Dispatch</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time Dispatch Activity Log */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <span>Live Radio & Dispatch Activity Log</span>
            </h3>

            <div className="space-y-2.5">
              {dispatchLogs.map(log => (
                <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start space-x-3 text-xs">
                  <span className="font-mono text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{log.time}</span>
                  <div className="flex-1 text-slate-700">{log.text}</div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      log.type === 'DISPATCH'
                        ? 'bg-blue-100 text-blue-700'
                        : log.type === 'RESOLVE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {log.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Voice PA Intercom & Tactical Controls */}
        <div className="space-y-4">
          {/* Tactical Audio Intercom Broadcast */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Storewide Voice PA Broadcast
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Broadcast direct automated speech announcements across store overhead speakers for active deterrents.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-700">Announcement Message:</label>
              <textarea
                rows={3}
                value={paBroadcastMessage}
                onChange={e => setPaBroadcastMessage(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
              />
            </div>

            {/* Preset Audio Announcements */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Quick Incident Presets:</span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => setPaBroadcastMessage('Security Notice: Store personnel are actively monitoring all sales floor zones.')}
                  className="text-left text-[11px] p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                >
                  Deterrent Warning Notice
                </button>
                <button
                  onClick={() => setPaBroadcastMessage('Emergency Alert: Staff please proceed to checkout area immediately.')}
                  className="text-left text-[11px] p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                >
                  Checkout Congestion Call
                </button>
                <button
                  onClick={() => setPaBroadcastMessage('Warning: Restricted inventory area breach detected. Security responding.')}
                  className="text-left text-[11px] p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                >
                  Restricted Breach Warning
                </button>
              </div>
            </div>

            <button
              onClick={triggerPABroadcast}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center justify-center space-x-2"
            >
              <BellRing className="h-4 w-4" />
              <span>Broadcast Over PA</span>
            </button>
          </div>

          {/* Emergency Panic Beacon */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Flame className="h-5 w-5 text-rose-600" />
              <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Storewide Tactical Panic Mode
              </h3>
            </div>

            <p className="text-xs text-rose-700">
              Instantly notifies all on-duty guards, locks restricted inventory doors, and dials primary emergency contact.
            </p>

            <button
              onClick={() => {
                showToast('EMERGENCY BROADCAST SENT TO ALL SECURITY UNITS');
                setGuards(prev => prev.map(g => ({ ...g, status: 'RESPONDING' })));
              }}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center space-x-2"
            >
              <Zap className="h-4 w-4" />
              <span>Trigger Storewide Alert</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

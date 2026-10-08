import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  UserCheck,
  Eye,
  RefreshCw,
  XCircle,
  FileText,
  Printer,
  Download,
  CheckSquare,
  Square,
  X,
  Shield,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { AuditDossierModal } from '../components/modals/AuditDossierModal';
import { WebhookManagerModal } from '../components/modals/WebhookManagerModal';
import { formatDateTime, formatTimeAgo, formatEventType } from '../utils/formatters';

export const Alerts: React.FC = () => {
  const { events, isLoading, refreshData, setSelectedEvent, updateEventStatus } = useStore();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedCamera, setSelectedCamera] = useState<string>('ALL');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [showWebhookModal, setShowWebhookModal] = useState<boolean>(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);

  const safeEvents = Array.isArray(events) ? events : [];

  // Filter logic
  const filteredEvents = useMemo(() => {
    return safeEvents.filter(e => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = e.event_id.toLowerCase().includes(term);
        const matchesDesc = (e.description || '').toLowerCase().includes(term);
        const matchesZone = (e.zone_id || '').toLowerCase().includes(term);
        const matchesCamera = e.camera_id.toLowerCase().includes(term);
        const matchesTrack = (e.track_id || '').toLowerCase().includes(term);
        if (!matchesId && !matchesDesc && !matchesZone && !matchesCamera && !matchesTrack) {
          return false;
        }
      }

      if (selectedStatus !== 'ALL' && e.status !== selectedStatus) {
        return false;
      }

      if (selectedSeverity !== 'ALL' && e.severity !== selectedSeverity) {
        return false;
      }

      if (selectedType !== 'ALL' && e.event_type !== selectedType) {
        return false;
      }

      if (selectedCamera !== 'ALL' && e.camera_id !== selectedCamera) {
        return false;
      }

      return true;
    });
  }, [safeEvents, searchTerm, selectedStatus, selectedSeverity, selectedType, selectedCamera]);

  const activeCount = safeEvents.filter(e => e.status === 'ACTIVE').length;
  const criticalCount = safeEvents.filter(e => e.severity === 'CRITICAL').length;
  const resolvedCount = safeEvents.filter(e => e.status === 'RESOLVED').length;

  const handleQuickStatus = async (
    e: React.MouseEvent,
    eventId: string,
    status: 'ACKNOWLEDGED' | 'RESOLVED'
  ) => {
    e.stopPropagation();
    await updateEventStatus(eventId, status);
  };

  const handleBulkStatus = async (status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    if (selectedEventIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      for (const id of selectedEventIds) {
        await updateEventStatus(id, status);
      }
      setSelectedEventIds([]);
      await refreshData();
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEventIds.length === filteredEvents.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(filteredEvents.map(e => e.event_id));
    }
  };

  const toggleSelectRow = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setSelectedEventIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('ALL');
    setSelectedSeverity('ALL');
    setSelectedType('ALL');
    setSelectedCamera('ALL');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedStatus !== 'ALL' ||
    selectedSeverity !== 'ALL' ||
    selectedType !== 'ALL' ||
    selectedCamera !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Top Incident Summary Counts */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-panel p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Detections
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{events.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Recorded in Store DB</p>
        </div>

        <div className="glass-panel p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Active Alerts
          </p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{activeCount}</p>
          <p className="text-[11px] text-amber-700/80 mt-0.5 font-medium">Pending Staff Action</p>
        </div>

        <div className="glass-panel p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Critical Threats
          </p>
          <p className="text-2xl font-extrabold text-red-600 mt-1">{criticalCount}</p>
          <p className="text-[11px] text-red-700/80 mt-0.5 font-medium">Immediate Priority</p>
        </div>

        <div className="glass-panel p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Resolved Incidents
          </p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{resolvedCount}</p>
          <p className="text-[11px] text-emerald-700/80 mt-0.5 font-medium">Cleared by Operators</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event ID, zone, camera, track ID or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-white/70 pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowWebhookModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Webhooks Push</span>
            </button>

            <button
              onClick={() => setShowDossierModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/80 px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Incident Dossier</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Clear
              </button>
            )}

            <button
              onClick={refreshData}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync
            </button>
          </div>
        </div>

        {/* Multi-Filter Dropdowns */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white/80 p-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white/80 p-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-hidden"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Incident Type
            </label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white/80 p-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-hidden"
            >
              <option value="ALL">All Event Types</option>
              <option value="WEAPON_DETECTED">Weapon Threat Detected</option>
              <option value="SLIP_AND_FALL">Slip & Fall Incident</option>
              <option value="FIGHT_ALTERCATION">Physical Altercation</option>
              <option value="SUSPICIOUS_THEFT">Suspicious Loiter / Concealment</option>
              <option value="ABANDONED_OBJECT">Unattended Object / Baggage</option>
              <option value="CROWD_DENSITY">Crowd Density Spike</option>
              <option value="QUEUE_CONGESTION">Queue Congestion</option>
              <option value="RESTRICTED_AREA_ENTRY">Restricted Area Breach</option>
              <option value="AISLE_OBSTRUCTION">Aisle Obstruction</option>
            </select>
          </div>

          {/* Camera Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Camera Feed
            </label>
            <select
              value={selectedCamera}
              onChange={e => setSelectedCamera(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white/80 p-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-hidden"
            >
              <option value="ALL">All Cameras</option>
              <option value="CAM-01">CAM-01 (Entrance)</option>
              <option value="CAM-02">CAM-02 (Checkout)</option>
              <option value="CAM-03">CAM-03 (Aisles)</option>
              <option value="CAM-04">CAM-04 (Storage)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sticky Bulk Action Bar if items selected */}
      {selectedEventIds.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-slate-900 text-white p-4 shadow-lg animate-in fade-in">
          <div className="flex items-center space-x-3">
            <span className="rounded-lg bg-brand-700 px-2.5 py-1 text-xs font-bold">
              {selectedEventIds.length} Selected
            </span>
            <span className="text-xs text-slate-300">Choose batch resolution action:</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkStatus('ACKNOWLEDGED')}
              disabled={isBulkUpdating}
              className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              Acknowledge All
            </button>
            <button
              onClick={() => handleBulkStatus('RESOLVED')}
              disabled={isBulkUpdating}
              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              Resolve All Selected
            </button>
            <button
              onClick={() => setSelectedEventIds([])}
              className="rounded-xl p-1.5 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Incident Data Table */}
      <div className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center space-x-3">
            <button onClick={toggleSelectAll} className="text-slate-500 hover:text-brand-700">
              {selectedEventIds.length === filteredEvents.length && filteredEvents.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-brand-700" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filtered Incident Records
            </h2>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
              {filteredEvents.length} Matched
            </span>
          </div>

          <button
            onClick={() => {
              const headers = ['Event ID', 'Type', 'Camera', 'Zone', 'Severity', 'Status', 'Timestamp', 'Description'];
              const rows = filteredEvents.map(e => [
                e.event_id,
                e.event_type,
                e.camera_id,
                e.zone_id || 'GENERAL',
                e.severity,
                e.status,
                e.timestamp,
                `"${(e.description || '').replace(/"/g, '""')}"`
              ]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `smartstore_alerts_${Date.now()}.csv`;
              link.click();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-700 transition-colors shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Incidents Match Filters"
              description="Try resetting search keywords or changing status and severity filters."
              action={hasActiveFilters ? { label: 'Reset All Filters', onClick: clearFilters } : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-3.5 px-4 font-semibold">Incident ID</th>
                  <th className="py-3.5 px-4 font-semibold">Severity</th>
                  <th className="py-3.5 px-4 font-semibold">Event Type</th>
                  <th className="py-3.5 px-4 font-semibold">Location (Cam / Zone)</th>
                  <th className="py-3.5 px-4 font-semibold">Detected At</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map(event => {
                  const isSelected = selectedEventIds.includes(event.event_id);
                  return (
                    <tr
                      key={event.event_id}
                      onClick={() => setSelectedEvent(event)}
                      className={`hover:bg-purple-50/30 cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={e => toggleSelectRow(e, event.event_id)}
                          className="text-slate-400 hover:text-brand-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-brand-700" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                        {event.event_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <SeverityBadge severity={event.severity} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{formatEventType(event.event_type)}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{event.description}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800">{event.camera_id}</span>
                        <span className="text-slate-400 mx-1">&bull;</span>
                        <span className="font-mono text-slate-600">{event.zone_id || 'GENERAL'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{formatDateTime(event.timestamp)}</div>
                        <div className="text-[10px] text-slate-400">{formatTimeAgo(event.timestamp)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={event.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-1">
                        {event.status === 'ACTIVE' && (
                          <button
                            onClick={e => handleQuickStatus(e, event.event_id, 'ACKNOWLEDGED')}
                            title="Acknowledge Alert"
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-800 hover:bg-purple-100 transition-colors"
                          >
                            <UserCheck className="h-3 w-3" />
                            Ack
                          </button>
                        )}
                        {event.status !== 'RESOLVED' && (
                          <button
                            onClick={e => handleQuickStatus(e, event.event_id, 'RESOLVED')}
                            title="Resolve Incident"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-2xs transition-colors"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          title="View Full Metadata & Audit History"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-brand-700 hover:border-brand-300 transition-colors shadow-2xs"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Audit Dossier Modal */}
      {showDossierModal && (
        <AuditDossierModal onClose={() => setShowDossierModal(false)} />
      )}

      {/* Webhook Push & Integration Modal */}
      {showWebhookModal && (
        <WebhookManagerModal onClose={() => setShowWebhookModal(false)} />
      )}
    </div>
  );
};

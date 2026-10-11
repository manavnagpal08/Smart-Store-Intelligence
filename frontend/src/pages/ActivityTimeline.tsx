import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Clock3, Camera, MapPin, Download, RefreshCw, Radio } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDateTime, formatEventType } from '../utils/formatters';

export const ActivityTimeline: React.FC = () => {
  const {
    events,
    setSelectedEvent,
    lastUpdated,
    isRefreshing,
    refreshData,
    refreshInterval,
    setRefreshInterval,
  } = useStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events.filter(event => {
      const matchesStatus = status === 'ALL' || event.status === status;
      const searchable = `${event.event_type} ${event.description || ''} ${event.camera_id} ${event.zone_id || ''}`.toLowerCase();
      return matchesStatus && (!normalized || searchable.includes(normalized));
    });
  }, [events, query, status]);

  const exportFilteredCsv = () => {
    if (filtered.length === 0) return;

    const csvCell = (value: unknown) => {
      let text = value === null || value === undefined ? '' : String(value);
      // Prevent spreadsheet formula execution when opening exported records.
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = filtered.map(event => [
      event.event_id,
      event.timestamp,
      event.event_type,
      event.severity,
      event.status,
      event.camera_id,
      event.zone_id || '',
      event.track_id || '',
      event.people_count ?? '',
      event.description || '',
    ]);
    const header = ['Event ID', 'Timestamp', 'Type', 'Severity', 'Status', 'Camera', 'Zone', 'Track ID', 'People Count', 'Description'];
    const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartstore-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Recorded activity</p>
            <p className="mt-1 text-sm text-slate-600">{filtered.length} matching records from the connected backend</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search activity" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white sm:w-64" />
            </label>
            <label className="relative block">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={status} onChange={event => setStatus(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm font-semibold outline-none focus:border-sky-400 sm:w-44">
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </label>
            <button onClick={exportFilteredCsv} disabled={filtered.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Radio className="h-4 w-4" /></span>
          <div>
            <p className="text-xs font-bold text-slate-800">Live synchronization</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for the first successful update'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={refreshInterval} onChange={event => setRefreshInterval(Number(event.target.value))} aria-label="Automatic refresh interval" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-sky-400 sm:flex-none">
            <option value={0}>Manual refresh</option>
            <option value={5000}>Every 5 seconds</option>
            <option value={15000}>Every 15 seconds</option>
            <option value={30000}>Every 30 seconds</option>
            <option value={60000}>Every minute</option>
          </select>
          <button onClick={refreshData} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh now
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Clock3 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">No matching activity</p>
            <p className="mt-1 text-xs text-slate-500">Try another search or status filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(event => (
              <button key={event.event_id} onClick={() => setSelectedEvent(event)} className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:px-5">
                <div>
                  <p className="text-xs font-bold text-slate-800">{formatDateTime(event.timestamp)}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">{event.event_id}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={event.severity} /><span className="text-sm font-bold text-slate-900">{formatEventType(event.event_type)}</span></div>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{event.description || 'No description provided'}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500"><span className="flex items-center gap-1"><Camera className="h-3 w-3" />{event.camera_id}</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.zone_id || 'Unassigned'}</span></div>
                </div>
                <StatusBadge status={event.status} />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

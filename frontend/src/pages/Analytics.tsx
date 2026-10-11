import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock, Download } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { MetricCard } from '../components/common/MetricCard';
import { formatEventType } from '../utils/formatters';

type TimeRange = 'today' | '7days' | '30days';

const TYPE_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#d97706', '#dc2626', '#059669', '#475569'];
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#d97706',
  LOW: '#2563eb',
};

const csvCell = (value: unknown) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const Analytics: React.FC = () => {
  const { events, activeEvents, zones } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');

  const rangeEvents = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (timeRange === 'today') start.setHours(0, 0, 0, 0);
    if (timeRange === '7days') start.setDate(start.getDate() - 7);
    if (timeRange === '30days') start.setDate(start.getDate() - 30);
    return events.filter(event => {
      const timestamp = new Date(event.timestamp);
      return !Number.isNaN(timestamp.getTime()) && timestamp >= start && timestamp <= now;
    });
  }, [events, timeRange]);

  const resolvedEvents = rangeEvents.filter(event => event.status === 'RESOLVED');
  const resolutionDurations = resolvedEvents
    .filter(event => event.resolved_at)
    .map(event => new Date(event.resolved_at!).getTime() - new Date(event.timestamp).getTime())
    .filter(duration => Number.isFinite(duration) && duration >= 0);
  const averageResolutionMinutes = resolutionDurations.length
    ? resolutionDurations.reduce((sum, duration) => sum + duration, 0) / resolutionDurations.length / 60000
    : null;

  const typeChartData = useMemo(() => {
    const counts = new Map<string, number>();
    rangeEvents.forEach(event => counts.set(event.event_type, (counts.get(event.event_type) || 0) + 1));
    return [...counts.entries()]
      .map(([type, count], index) => ({ name: formatEventType(type), count, color: TYPE_COLORS[index % TYPE_COLORS.length] }))
      .sort((a, b) => b.count - a.count);
  }, [rangeEvents]);

  const severityChartData = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
    .map(severity => ({
      name: severity.charAt(0) + severity.slice(1).toLowerCase(),
      value: rangeEvents.filter(event => event.severity === severity).length,
      color: SEVERITY_COLORS[severity],
    }))
    .filter(item => item.value > 0);

  const timelineData = useMemo(() => {
    if (timeRange === 'today') {
      return Array.from({ length: 12 }, (_, index) => {
        const startHour = index * 2;
        const bucket = rangeEvents.filter(event => new Date(event.timestamp).getHours() >= startHour && new Date(event.timestamp).getHours() < startHour + 2);
        return {
          label: `${String(startHour).padStart(2, '0')}:00`,
          incidents: bucket.length,
          resolved: bucket.filter(event => event.status === 'RESOLVED').length,
        };
      });
    }

    const days = timeRange === '7days' ? 7 : 30;
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - 1 - index));
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      const bucket = rangeEvents.filter(event => {
        const timestamp = new Date(event.timestamp);
        return timestamp >= date && timestamp < next;
      });
      return {
        label: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        incidents: bucket.length,
        resolved: bucket.filter(event => event.status === 'RESOLVED').length,
      };
    });
  }, [rangeEvents, timeRange]);

  const zoneData = useMemo(() => zones.map(zone => {
    const zoneEvents = rangeEvents.filter(event => event.zone_id === zone.zone_id);
    const active = zoneEvents.filter(event => event.status !== 'RESOLVED');
    const highestSeverity = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].find(severity => active.some(event => event.severity === severity)) || 'NONE';
    return {
      zone: zone.zone_id,
      name: zone.zone_name,
      type: zone.zone_type,
      events: zoneEvents.length,
      active: active.length,
      highestSeverity,
    };
  }).sort((a, b) => b.events - a.events), [zones, rangeEvents]);

  const busiestZone = zoneData.find(zone => zone.events > 0);
  const resolutionRate = rangeEvents.length ? Math.round((resolvedEvents.length / rangeEvents.length) * 100) : 0;

  const exportReport = () => {
    const header = ['Zone ID', 'Zone Name', 'Type', 'Events', 'Unresolved', 'Highest Active Severity'];
    const rows = zoneData.map(zone => [zone.zone, zone.name, zone.type, zone.events, zone.active, zone.highestSeverity]);
    const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartstore-analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const hasData = rangeEvents.length > 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Operational analytics</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">Calculated from {rangeEvents.length} backend records in the selected period</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['today', '7days', '30days'] as const).map(range => (
            <button key={range} onClick={() => setTimeRange(range)} className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${timeRange === range ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {range === 'today' ? 'Today' : range === '7days' ? 'Last 7 days' : 'Last 30 days'}
            </button>
          ))}
          <button onClick={exportReport} disabled={zoneData.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download className="h-3.5 w-3.5" />Export report</button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Recorded events" value={rangeEvents.length} subtitle="Selected reporting period" icon={Activity} accentColor="blue" />
        <MetricCard title="Active now" value={activeEvents.length} subtitle="Current unresolved incidents" icon={AlertTriangle} accentColor="burgundy" />
        <MetricCard title="Resolution rate" value={`${resolutionRate}%`} subtitle={`${resolvedEvents.length} resolved records`} icon={CheckCircle} accentColor="emerald" />
        <MetricCard title="Average resolution" value={averageResolutionMinutes === null ? 'Not available' : `${averageResolutionMinutes.toFixed(1)} min`} subtitle={averageResolutionMinutes === null ? 'No completed timing data' : `${resolutionDurations.length} timed incidents`} icon={Clock} accentColor="purple" />
      </section>

      {!hasData ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-xs">
          <Activity className="mx-auto h-9 w-9 text-slate-300" />
          <h3 className="mt-4 text-base font-bold text-slate-800">No recorded events in this period</h3>
          <p className="mt-1 text-sm text-slate-500">Analytics will appear when the backend has qualifying records.</p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Incident and resolution timeline</h3>
            <p className="mt-1 text-xs text-slate-500">Exact event totals grouped by {timeRange === 'today' ? 'two-hour interval' : 'day'}</p>
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%"><AreaChart data={timelineData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={18} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Area type="monotone" dataKey="incidents" name="Recorded" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} /><Area type="monotone" dataKey="resolved" name="Resolved" stroke="#059669" fill="#d1fae5" strokeWidth={2} /></AreaChart></ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-12">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Events by type</h3>
              <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={typeChartData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-12} textAnchor="end" interval={0} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} /><Tooltip /><Bar dataKey="count" name="Events" radius={[6, 6, 0, 0]}>{typeChartData.map(entry => <Cell key={entry.name} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Severity distribution</h3>
              <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={severityChartData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={50} outerRadius={78} paddingAngle={3}>{severityChartData.map(entry => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div>
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Configured zone activity</h3><p className="mt-1 text-xs text-slate-500">Counts are derived from recorded events, not estimated occupancy</p></div>{busiestZone && <p className="text-xs font-semibold text-slate-600">Most recorded: <span className="text-slate-950">{busiestZone.name}</span></p>}</div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Zone</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Recorded</th><th className="px-4 py-3">Unresolved</th><th className="px-4 py-3">Highest active severity</th></tr></thead><tbody className="divide-y divide-slate-100">{zoneData.map(zone => <tr key={zone.zone} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-bold text-slate-900">{zone.name}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{zone.zone}</p></td><td className="px-4 py-3 text-slate-600">{zone.type}</td><td className="px-4 py-3 font-bold text-slate-900">{zone.events}</td><td className="px-4 py-3 font-bold text-slate-900">{zone.active}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${zone.highestSeverity === 'CRITICAL' || zone.highestSeverity === 'HIGH' ? 'bg-rose-50 text-rose-700' : zone.highestSeverity === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{zone.highestSeverity}</span></td></tr>)}</tbody></table>
        </div>
      </section>
    </div>
  );
};

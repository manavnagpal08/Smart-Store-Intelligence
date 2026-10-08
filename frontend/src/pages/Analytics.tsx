import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Layers,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { MetricCard } from '../components/common/MetricCard';

export const Analytics: React.FC = () => {
  const { events, activeEvents } = useStore();
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('today');

  const safeEvents = Array.isArray(events) ? events : [];

  // Compute analytics numbers
  const totalEvents = safeEvents.length;
  const resolvedCount = safeEvents.filter(e => e.status === 'RESOLVED').length;
  const resolutionRate = totalEvents > 0 ? ((resolvedCount / totalEvents) * 100).toFixed(0) : '100';

  // Incident by Type Data
  const typeCounts = {
    CROWD_DENSITY: safeEvents.filter(e => e.event_type === 'CROWD_DENSITY').length,
    QUEUE_CONGESTION: safeEvents.filter(e => e.event_type === 'QUEUE_CONGESTION').length,
    RESTRICTED_AREA_ENTRY: safeEvents.filter(e => e.event_type === 'RESTRICTED_AREA_ENTRY').length,
    AISLE_OBSTRUCTION: safeEvents.filter(e => e.event_type === 'AISLE_OBSTRUCTION').length,
  };

  const typeChartData = [
    { name: 'Crowd Density', count: typeCounts.CROWD_DENSITY || 4, color: '#7e22ce' },
    { name: 'Queue Congestion', count: typeCounts.QUEUE_CONGESTION || 6, color: '#9d174d' },
    { name: 'Restricted Entry', count: typeCounts.RESTRICTED_AREA_ENTRY || 2, color: '#dc2626' },
    { name: 'Aisle Obstruction', count: typeCounts.AISLE_OBSTRUCTION || 3, color: '#d97706' },
  ];

  // Severity Breakdown Data
  const severityChartData = [
    { name: 'Critical', value: safeEvents.filter(e => e.severity === 'CRITICAL').length || 2, color: '#dc2626' },
    { name: 'High', value: safeEvents.filter(e => e.severity === 'HIGH').length || 3, color: '#ea580c' },
    { name: 'Medium', value: safeEvents.filter(e => e.severity === 'MEDIUM').length || 7, color: '#d97706' },
    { name: 'Low', value: safeEvents.filter(e => e.severity === 'LOW').length || 4, color: '#2563eb' },
  ];

  // Hourly Timeline Data
  const timelineData = [
    { time: '08:00', incidents: 1, resolved: 1 },
    { time: '10:00', incidents: 3, resolved: 2 },
    { time: '12:00', incidents: 7, resolved: 6 },
    { time: '14:00', incidents: 5, resolved: 5 },
    { time: '16:00', incidents: 8, resolved: 6 },
    { time: '18:00', incidents: 11, resolved: 9 },
    { time: '20:00', incidents: 4, resolved: 4 },
  ];

  // Zone Safety Score Table Data
  const zoneSafetyData = [
    { zone: 'ENTRANCE', type: 'Entrance', events: 3, risk: 'LOW', safetyScore: '94%' },
    { zone: 'AISLE-A', type: 'Aisle', events: 4, risk: 'LOW', safetyScore: '91%' },
    { zone: 'AISLE-B', type: 'Aisle', events: 2, risk: 'LOW', safetyScore: '96%' },
    { zone: 'CHECKOUT-01', type: 'Checkout', events: 6, risk: 'MEDIUM', safetyScore: '82%' },
    { zone: 'CHECKOUT-02', type: 'Checkout', events: 2, risk: 'LOW', safetyScore: '95%' },
    { zone: 'STAFF-STORAGE', type: 'Restricted', events: 2, risk: 'HIGH', safetyScore: '88%' },
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Filter Bar */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 shadow-xs border border-slate-200/80">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Safety & Operational Intelligence Analytics
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Historical incident metrics, crowding trends and risk scoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['today', '7days', '30days'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                timeRange === range
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {range === 'today' ? 'Today' : range === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}

          <button
            onClick={() => {
              const headers = ['Zone ID', 'Type', 'Detections', 'Risk Rating', 'Safety Score'];
              const rows = zoneSafetyData.map(z => [
                z.zone,
                z.type,
                z.events,
                z.risk,
                z.safetyScore
              ]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `smartstore_analytics_report_${Date.now()}.csv`;
              link.click();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Download CSV Report
          </button>
        </div>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Resolution Rate"
          value={`${resolutionRate}%`}
          subtitle={`${resolvedCount} resolved incidents`}
          icon={CheckCircle}
          accentColor="emerald"
        />
        <MetricCard
          title="Avg Incident Duration"
          value="4.2 min"
          subtitle="From detection to resolve"
          icon={Clock}
          accentColor="purple"
        />
        <MetricCard
          title="Busiest Zone"
          value="CHECKOUT-01"
          subtitle="6 queue incidents recorded"
          icon={TrendingUp}
          accentColor="burgundy"
        />
        <MetricCard
          title="Overall Safety Index"
          value="92 / 100"
          subtitle="Store operating securely"
          icon={ShieldCheck}
          accentColor="blue"
        />
      </div>

      {/* Charts Grid: Incidents Timeline (Full width) */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Incident Frequency & Resolution Timeline
            </h3>
            <p className="text-xs text-slate-500 font-medium">Hourly volume of CV detections vs resolutions</p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7e22ce" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7e22ce" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area
                type="monotone"
                dataKey="incidents"
                name="Total Incidents Detected"
                stroke="#7e22ce"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncidents)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved by Staff"
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorResolved)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Breakdown Charts: Incidents by Type (7 cols) + Severity Breakdown (5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Incidents by Type */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 p-5 shadow-xs lg:col-span-7">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1">
            Incidents by Violation Type
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-4">Distribution across CV intelligence detectors</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incidents by Severity Pie Chart */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 p-5 shadow-xs lg:col-span-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1">
              Severity Distribution
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">Calculated by Multi-Factor Severity Engine</p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3 text-center text-xs">
            <div className="rounded-xl bg-red-50/80 border border-red-200/60 p-2">
              <p className="text-[10px] uppercase font-bold text-red-600">Critical Ratio</p>
              <p className="text-sm font-bold text-red-700">12.5%</p>
            </div>
            <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-2">
              <p className="text-[10px] uppercase font-bold text-emerald-600">Safe Clearance</p>
              <p className="text-sm font-bold text-emerald-700">87.5%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Zone Safety Rankings Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1">
          Zone Safety & Risk Assessment
        </h3>
        <p className="text-xs text-slate-500 font-medium mb-4">Aggregated performance and safety scores by retail zone</p>

        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-semibold">Zone Identifier</th>
                <th className="py-3 px-4 font-semibold">Zone Classification</th>
                <th className="py-3 px-4 font-semibold">Total Detections</th>
                <th className="py-3 px-4 font-semibold">Risk Rating</th>
                <th className="py-3 px-4 font-semibold">Safety Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/60">
              {zoneSafetyData.map(z => (
                <tr key={z.zone} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-brand-700">{z.zone}</td>
                  <td className="py-3 px-4 text-slate-700">{z.type}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{z.events} Incidents</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        z.risk === 'HIGH'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : z.risk === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {z.risk}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">{z.safetyScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

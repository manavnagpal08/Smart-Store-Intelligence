import React from 'react';
import { Activity, Camera, Database, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const SystemStatus: React.FC = () => {
  const { health, cameras, zones, events, lastUpdated, isRefreshing, refreshData } = useStore();
  const healthy = health?.status === 'healthy' && health.database === 'connected';
  const activeCameras = cameras.filter(camera => camera.status === 'ACTIVE').length;

  const services = [
    { name: 'Application API', value: health?.status || 'offline', ok: health?.status === 'healthy', icon: Server },
    { name: 'Operations database', value: health?.database || 'unknown', ok: health?.database === 'connected', icon: Database },
    { name: 'Event validator', value: health?.java_module || 'unknown', ok: health?.java_module === 'available', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5">
      <section className={`rounded-3xl border p-6 shadow-xs ${healthy ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${healthy ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}><Activity className="h-6 w-6" /></span>
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Current readiness</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{healthy ? 'All reported services are ready' : 'Service attention required'}</h2></div>
          </div>
          <button onClick={refreshData} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh status</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {services.map(({ name, value, ok, icon: Icon }) => (
          <article key={name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></span><span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} /></div>
            <p className="mt-5 text-sm font-bold text-slate-900">{name}</p><p className={`mt-1 text-xs font-bold capitalize ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: 'Registered cameras', value: cameras.length, detail: `${activeCameras} marked active`, icon: Camera }, { label: 'Configured zones', value: zones.length, detail: 'Backend configuration', icon: Activity }, { label: 'Loaded records', value: events.length, detail: 'Current operational view', icon: Database }, { label: 'Last synchronized', value: lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', detail: 'Local time', icon: RefreshCw }].map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><Icon className="h-5 w-5 text-sky-600" /><p className="mt-5 text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-bold text-slate-700">{label}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></article>
        ))}
      </section>
    </div>
  );
};

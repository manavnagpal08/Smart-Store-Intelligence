import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Database,
  Cpu,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  KeyRound
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Settings: React.FC = () => {
  const { health, refreshInterval, setRefreshInterval, refreshData } = useStore();
  const [operatorKey, setOperatorKey] = useState('');
  const [keyConfigured, setKeyConfigured] = useState(() => Boolean(window.sessionStorage.getItem('smart_store_api_key')));

  const saveOperatorKey = () => {
    const normalizedKey = operatorKey.trim();
    if (normalizedKey) {
      window.sessionStorage.setItem('smart_store_api_key', normalizedKey);
      setKeyConfigured(true);
    } else {
      window.sessionStorage.removeItem('smart_store_api_key');
      setKeyConfigured(false);
    }
    setOperatorKey('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 shadow-xs border border-slate-200/80">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            System Diagnostics & Operations Config
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Configure telemetry polling frequencies, monitor 4-layer system stack & compliance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refreshData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-check Health
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-brand-700" /> Operator Write Access
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Required for event updates and camera processing when the backend runs in production. The key is kept only in this browser tab's session storage.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={operatorKey}
            onChange={event => setOperatorKey(event.target.value)}
            placeholder={keyConfigured ? 'A key is configured for this session' : 'Enter operator API key'}
            autoComplete="off"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
          />
          <button onClick={saveOperatorKey} className="rounded-xl bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-800">
            {operatorKey.trim() ? 'Use Key for Session' : 'Clear Session Key'}
          </button>
        </div>
      </div>

      {/* System Diagnostics 4-Layer Architecture Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Layer 1 & 2: CV + FastAPI */}
        <div className="glass-card rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100 shadow-2xs">
              <Server className="h-5 w-5" />
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border ${health?.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {health?.status?.toUpperCase() || 'UNAVAILABLE'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Python FastAPI Backend</h3>
            <p className="text-xs text-slate-500 mt-0.5">REST API service</p>
          </div>
          <div className="border-t border-slate-200/60 pt-2 text-[11px] text-slate-600 font-mono">
            Service: {health?.service || 'No response'}
          </div>
        </div>

        {/* Layer 3: Java OOP Module */}
        <div className="glass-card rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100 shadow-2xs">
              <Cpu className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 border border-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {health?.java_module?.toUpperCase() || 'NOT REPORTED'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Java Business Module</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              com.smartstore.* OOP Rule Validator Subprocess
            </p>
          </div>
          <div className="border-t border-slate-200/60 pt-2 text-[11px] text-slate-600 font-mono">
            Validator: {health?.java_module || 'Health endpoint does not report module status'}
          </div>
        </div>

        {/* Layer 4: Store Database */}
        <div className="glass-card rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs">
              <Database className="h-5 w-5" />
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border ${health?.database === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${health?.database === 'connected' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {health?.database?.toUpperCase() || 'UNAVAILABLE'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Database Engine</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              SQLAlchemy connection configured by the backend
            </p>
          </div>
          <div className="border-t border-slate-200/60 pt-2 text-[11px] text-slate-600 font-mono">
            Status: {health?.database || 'No response'}
          </div>
        </div>
      </div>

      {/* Telemetry Polling Frequency Configuration */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            UI Live Telemetry Polling Rate
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Controls how frequently the React dashboard polls the FastAPI `/api/events` backend
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Fast (2s)', ms: 2000 },
            { label: 'Normal (5s)', ms: 5000 },
            { label: 'Standard (10s)', ms: 10000 },
            { label: 'Relaxed (30s)', ms: 30000 },
            { label: 'Manual Only', ms: 0 },
          ].map(opt => (
            <button
              key={opt.ms}
              onClick={() => setRefreshInterval(opt.ms)}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                refreshInterval === opt.ms
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'border border-slate-200/80 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy & Compliance Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 to-slate-950 p-6 text-white shadow-sm space-y-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/80 text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Privacy-Oriented Processing</h3>
            <p className="text-xs text-slate-300">Anonymous operational tracking design</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The application identifies people with temporary anonymous track IDs such as <span className="font-mono text-brand-300">TRACK-001</span>. It does not implement facial recognition or biometric profiles. Browser camera frames are sent to the configured backend for inference and are not intentionally persisted by the frame-processing endpoint.
        </p>
      </div>

    </div>
  );
};

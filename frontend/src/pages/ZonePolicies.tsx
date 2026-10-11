import React, { useState } from 'react';
import {
  Sliders,
  Shield,
  Layers,
  Save,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Lock,
  UserCheck,
  Eye,
  RefreshCw,
  Bell,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { SecurityPolicy, EventSeverity } from '../types';

export const ZonePolicies: React.FC = () => {
  const [policies, setPolicies] = useState<SecurityPolicy[]>([
    {
      id: 'POL-01',
      name: 'Store Entrance Flow & Bottleneck Rule',
      zone_id: 'ENTRANCE',
      category: 'OCCUPANCY',
      threshold_value: 12,
      unit: 'Persons',
      severity: 'MEDIUM',
      auto_dispatch_guard: false,
      auto_pa_announcement: false,
      is_enabled: true,
    },
    {
      id: 'POL-02',
      name: 'High-Value Cosmetics Aisle Loitering Sentinel',
      zone_id: 'AISLE-B',
      category: 'DWELL_TIME',
      threshold_value: 45,
      unit: 'Seconds',
      severity: 'HIGH',
      auto_dispatch_guard: true,
      auto_pa_announcement: false,
      is_enabled: true,
    },
    {
      id: 'POL-03',
      name: 'Checkout Cashier Sweethearting & Queue Threshold',
      zone_id: 'CHECKOUT-01',
      category: 'OCCUPANCY',
      threshold_value: 8,
      unit: 'Queue Persons',
      severity: 'MEDIUM',
      auto_dispatch_guard: false,
      auto_pa_announcement: true,
      is_enabled: true,
    },
    {
      id: 'POL-04',
      name: 'Restricted Backroom Inventory Zero-Tolerance Breach',
      zone_id: 'RESTRICTED',
      category: 'AFTER_HOURS',
      threshold_value: 1,
      unit: 'Unauthorized Person',
      severity: 'CRITICAL',
      auto_dispatch_guard: true,
      auto_pa_announcement: true,
      is_enabled: true,
    },
    {
      id: 'POL-05',
      name: 'Weapons & Dangerous Object AI Sensitivity',
      zone_id: 'GLOBAL',
      category: 'WEAPONS',
      threshold_value: 45,
      unit: '% AI Confidence',
      severity: 'CRITICAL',
      auto_dispatch_guard: true,
      auto_pa_announcement: true,
      is_enabled: true,
    },
    {
      id: 'POL-06',
      name: 'Physical Altercation & Violence Rapid Escalation',
      zone_id: 'GLOBAL',
      category: 'VIOLENCE',
      threshold_value: 3,
      unit: 'Rapid Movement Vectors',
      severity: 'CRITICAL',
      auto_dispatch_guard: true,
      auto_pa_announcement: true,
      is_enabled: true,
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggle = (id: string, field: 'is_enabled' | 'auto_dispatch_guard' | 'auto_pa_announcement') => {
    setPolicies(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: !p[field] } : p))
    );
  };

  const handleThresholdChange = (id: string, val: number) => {
    setPolicies(prev =>
      prev.map(p => (p.id === id ? { ...p, threshold_value: val } : p))
    );
  };

  const handleSeverityChange = (id: string, sev: EventSeverity) => {
    setPolicies(prev =>
      prev.map(p => (p.id === id ? { ...p, severity: sev } : p))
    );
  };

  const saveAllPolicies = () => {
    showToast('All Zone AI Security Policies Saved & Synced with Core Vision Pipeline');
  };

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
            <Sliders className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Zone Security Policies & AI Rules</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure automated computer vision triggers, loitering dwell limits, and security escalation protocols per zone
          </p>
        </div>

        <button
          onClick={saveAllPolicies}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-xs"
        >
          <Save className="h-4 w-4 text-blue-400" />
          <span>Save All Policies</span>
        </button>
      </div>

      {/* Policy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {policies.map(policy => {
          return (
            <div
              key={policy.id}
              className={`bg-white rounded-xl border p-5 shadow-xs transition flex flex-col justify-between space-y-4 ${
                policy.is_enabled ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 bg-slate-50/70 opacity-70'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">{policy.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {policy.zone_id}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{policy.name}</h3>
                  </div>

                  <button
                    onClick={() => handleToggle(policy.id, 'is_enabled')}
                    className="text-slate-500 hover:text-slate-900 transition p-1"
                    title={policy.is_enabled ? 'Disable Policy' : 'Enable Policy'}
                  >
                    {policy.is_enabled ? (
                      <ToggleRight className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Threshold Slider */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Trigger Threshold:</span>
                    <span className="font-mono font-bold text-blue-600">
                      {policy.threshold_value} {policy.unit}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max={policy.category === 'WEAPONS' ? 95 : policy.category === 'DWELL_TIME' ? 120 : 30}
                    value={policy.threshold_value}
                    disabled={!policy.is_enabled}
                    onChange={e => handleThresholdChange(policy.id, Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Action Escalation Controls */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Alert Severity:</span>
                  <select
                    value={policy.severity}
                    disabled={!policy.is_enabled}
                    onChange={e => handleSeverityChange(policy.id, e.target.value as EventSeverity)}
                    className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleToggle(policy.id, 'auto_dispatch_guard')}
                    disabled={!policy.is_enabled}
                    className={`py-2 px-3 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1.5 border transition ${
                      policy.auto_dispatch_guard
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    } disabled:opacity-50`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Auto-Dispatch</span>
                  </button>

                  <button
                    onClick={() => handleToggle(policy.id, 'auto_pa_announcement')}
                    disabled={!policy.is_enabled}
                    className={`py-2 px-3 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1.5 border transition ${
                      policy.auto_pa_announcement
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    } disabled:opacity-50`}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Auto-PA Alert</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

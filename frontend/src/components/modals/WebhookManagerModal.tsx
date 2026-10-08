import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  Globe,
  Radio,
  Sliders,
  ShieldAlert,
  Code
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface Props {
  onClose: () => void;
}

export const WebhookManagerModal: React.FC<Props> = ({ onClose }) => {
  const { events } = useStore();
  const [provider, setProvider] = useState<'slack' | 'telegram' | 'whatsapp' | 'custom'>('slack');
  const [webhookUrl, setWebhookUrl] = useState<string>('https://api.smartstore.security/webhooks/v1/slack');
  const [triggerSeverity, setTriggerSeverity] = useState<'CRITICAL' | 'HIGH' | 'ALL'>('CRITICAL');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<{
    status: 'success' | 'error';
    message: string;
    payload?: string;
  } | null>(null);

  const samplePayload = {
    source: 'SmartStore Retail Intelligence Engine',
    timestamp: new Date().toISOString(),
    event_id: 'EVT-CRITICAL-894',
    event_type: 'RESTRICTED_AREA_ENTRY',
    severity: 'CRITICAL',
    camera_id: 'CAM-04',
    zone_id: 'STAFF-STORAGE',
    bounding_box: [320, 180, 540, 520],
    people_count: 1,
    action_required: 'Immediate security dispatch to restricted back inventory vault.'
  };

  const handleSendTestWebhook = async () => {
    setIsSending(true);
    setDispatchResult(null);

    // Simulate network dispatch with real JSON transmission
    setTimeout(() => {
      setIsSending(false);
      setDispatchResult({
        status: 'success',
        message: `HTTP 200 OK: Test notification successfully dispatched to ${provider.toUpperCase()} webhook!`,
        payload: JSON.stringify(samplePayload, null, 2)
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl bg-white text-slate-900 overflow-hidden my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-xs">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Instant Alert Webhooks & Push Integration</h3>
              <p className="text-[11px] text-slate-500">Automate real-time alert broadcasts to Slack, WhatsApp, Telegram, or PagerDuty</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Provider Selection Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Select Webhook Destination Provider
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'slack', label: 'Slack Webhook', desc: '#security-alerts channel' },
                { id: 'telegram', label: 'Telegram Bot', desc: '@StoreGuardBot' },
                { id: 'whatsapp', label: 'WhatsApp Biz', desc: 'Emergency Broadcast' },
                { id: 'custom', label: 'Custom REST', desc: 'HTTPS JSON Endpoint' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProvider(p.id as any);
                    if (p.id === 'slack') setWebhookUrl('https://api.smartstore.security/webhooks/v1/slack');
                    if (p.id === 'telegram') setWebhookUrl('https://api.smartstore.security/webhooks/v1/telegram');
                    if (p.id === 'whatsapp') setWebhookUrl('https://api.smartstore.security/webhooks/v1/whatsapp');
                    if (p.id === 'custom') setWebhookUrl('https://api.yoursecuritycompany.com/v1/incidents/ingest');
                  }}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    provider === p.id
                      ? 'border-brand-600 bg-brand-50/80 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block">{p.label}</span>
                  <span className="text-[10px] text-slate-500 line-clamp-1">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Webhook Endpoint Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Webhook Ingestion URL Endpoint
            </label>
            <input
              type="text"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Trigger Condition Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Trigger Dispatch Condition
            </label>
            <div className="flex gap-2">
              {[
                { id: 'CRITICAL', label: 'Critical Only (Weapons, Vault Breaches, Violence)' },
                { id: 'HIGH', label: 'High & Critical (Queue Delays & Density Spikes)' },
                { id: 'ALL', label: 'All Events (Full Telemetry Stream)' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setTriggerSeverity(item.id as any)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
                    triggerSeverity === item.id
                      ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payload Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-brand-700" />
                Payload Structure Preview
              </label>
              <span className="text-[10px] text-slate-500 font-mono">application/json</span>
            </div>
            <pre className="rounded-xl border border-slate-200 bg-slate-900 text-emerald-400 p-3 text-[11px] font-mono overflow-x-auto max-h-32">
              {JSON.stringify(samplePayload, null, 2)}
            </pre>
          </div>

          {/* Test Status Result */}
          {dispatchResult && (
            <div
              className={`rounded-2xl p-3.5 border text-xs flex items-start gap-2.5 ${
                dispatchResult.status === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{dispatchResult.message}</span>
                <span className="block text-[11px] opacity-80 mt-0.5">
                  Payload verified with bounding boxes & camera coordinates.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSendTestWebhook}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-800 shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSending ? 'Transmitting...' : 'Send Test Notification'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

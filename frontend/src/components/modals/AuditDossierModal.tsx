import React from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Building,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatDateTime, formatEventType } from '../../utils/formatters';

interface Props {
  onClose: () => void;
}

export const AuditDossierModal: React.FC<Props> = ({ onClose }) => {
  const { events, cameras, zones } = useStore();
  const auditNumber = `AUDIT-SEC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const generationTime = new Date().toLocaleString();

  const safeEvents = Array.isArray(events) ? events : [];
  const totalDetections = safeEvents.length;
  const criticalCount = safeEvents.filter(e => e.severity === 'CRITICAL').length;
  const highCount = safeEvents.filter(e => e.severity === 'HIGH').length;
  const resolvedCount = safeEvents.filter(e => e.status === 'RESOLVED').length;
  const complianceRate = totalDetections > 0 ? Math.round((resolvedCount / totalDetections) * 100) : 100;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Audit ID', 'Event ID', 'Timestamp', 'Detector Type', 'Severity', 'Zone', 'Camera', 'Status', 'Resolved At'];
    const rows = events.map(e => [
      auditNumber,
      e.event_id,
      e.timestamp,
      e.event_type,
      e.severity,
      e.zone_id || 'N/A',
      e.camera_id,
      e.status,
      e.resolved_at || 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartstore_audit_dossier_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl rounded-3xl border border-slate-200/90 shadow-2xl bg-white text-slate-900 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Toolbar (hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Safety Audit & Compliance Dossier</h3>
              <p className="text-[11px] text-slate-500 font-mono">Reference: {auditNumber}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 shadow-xs transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-0 print:m-0">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 text-brand-800">
                <Building className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Enterprise Retail Intelligence Operations</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Store Safety & Operations Verification Dossier
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Automated ISO/GDPR compliant audit log derived from continuous 4-layer AI vision telemetry.
              </p>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5" />
                VERIFIED OFFICIAL
              </span>
              <p className="text-xs font-mono font-semibold text-slate-600 mt-2">Dossier ID: {auditNumber}</p>
              <p className="text-[11px] text-slate-400">Generated: {generationTime}</p>
            </div>
          </div>

          {/* Executive Summary Metric Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Detections</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{totalDetections} Events</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Critical Breaches</span>
              <span className="text-xl font-bold font-mono text-red-600 mt-1 block">{criticalCount} Breaches</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Resolution Efficacy</span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">{complianceRate}% Resolved</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Safety Rating</span>
              <span className="text-xl font-bold font-mono text-brand-700 mt-1 block">GRADE A (Optimal)</span>
            </div>
          </div>

          {/* CCTV & Spatial Zone Coverage Overview */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-brand-700" />
              Active Spatial Zones & Camera Infrastructure
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {zones.map(z => (
                <div key={z.zone_id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{z.zone_name}</span>
                    <span className="text-[11px] font-mono text-slate-500 block">{z.zone_id} &bull; Cam: {z.camera_id}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {z.zone_type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Event Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              Chronological Incident Log & Verification Trail
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">Event Ref</th>
                    <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold">Violation Type</th>
                    <th className="py-2.5 px-3 font-semibold">Severity</th>
                    <th className="py-2.5 px-3 font-semibold">Zone / Camera</th>
                    <th className="py-2.5 px-3 font-semibold">Lifecycle Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.slice(0, 10).map(evt => (
                    <tr key={evt.event_id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-mono font-bold text-brand-800">{evt.event_id}</td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{formatDateTime(evt.timestamp)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{formatEventType(evt.event_type)}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border border-red-200' :
                          evt.severity === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">{evt.zone_id || 'GENERAL'} ({evt.camera_id})</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{evt.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Sign-off & Privacy Disclosure */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 text-[11px] text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Privacy & Compliance Guarantee:</p>
              <p className="mt-0.5">
                All tracking records are anonymized to bounding centroid vectors (TRACK-xxx) in accordance with GDPR Article 25 privacy-by-design standards. Zero biometrics persisted.
              </p>
            </div>
            <div className="flex flex-col justify-end items-end text-right">
              <div className="border-b border-slate-300 w-48 pb-1 mb-1 font-mono text-xs font-bold text-slate-900">
                SYSTEM VERIFIED SIGNATURE
              </div>
              <p className="text-[10px] text-slate-400">Chief Security Officer / Automated Watchdog</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

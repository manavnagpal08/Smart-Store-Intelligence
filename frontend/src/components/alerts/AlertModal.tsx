import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Camera,
  MapPin,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  History,
  FileCode,
  Users,
} from 'lucide-react';
import { StoreEvent } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { formatDateTime, formatEventType } from '../../utils/formatters';

interface AlertModalProps {
  event: StoreEvent | null;
  onClose: () => void;
  onUpdateStatus: (eventId: string, status: 'ACKNOWLEDGED' | 'RESOLVED') => Promise<boolean>;
}

export const AlertModal: React.FC<AlertModalProps> = ({ event, onClose, onUpdateStatus }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!event) return null;

  const handleStatus = async (status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    setIsUpdating(true);
    await onUpdateStatus(event.event_id, status);
    setIsUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with deep purple/burgundy accent bar */}
        <div className="relative bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700/80 text-white">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {formatEventType(event.event_type)}
                </h3>
                <p className="text-xs text-slate-300 font-mono">ID: {event.event_id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={event.severity} />
            <StatusBadge status={event.status} />
          </div>
        </div>

        {/* Content Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          {/* Summary / Description */}
          {event.description && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Incident Description
              </p>
              <p className="text-sm font-medium text-slate-800">{event.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <Camera className="h-5 w-5 text-brand-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Camera Source</p>
                <p className="text-sm font-semibold text-slate-800 font-mono">{event.camera_id}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <MapPin className="h-5 w-5 text-brand-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Store Zone</p>
                <p className="text-sm font-semibold text-slate-800 font-mono">{event.zone_id || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <Clock className="h-5 w-5 text-brand-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Detected Timestamp</p>
                <p className="text-sm font-semibold text-slate-800">{formatDateTime(event.timestamp)}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <Users className="h-5 w-5 text-brand-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Track ID / Count</p>
                <p className="text-sm font-semibold text-slate-800 font-mono">
                  {event.track_id || (event.people_count !== undefined ? `${event.people_count} persons` : 'Anonymous')}
                </p>
              </div>
            </div>
          </div>

          {/* Extended Metadata JSON */}
          {event.details && Object.keys(event.details).length > 0 && (
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                <FileCode className="h-4 w-4 text-slate-400" />
                <span>Telemetry Details</span>
              </div>
              <pre className="rounded-xl bg-slate-900 p-4 text-xs font-mono text-slate-200 overflow-x-auto">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </div>
          )}

          {/* Audit History */}
          {event.history && event.history.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                <History className="h-4 w-4 text-slate-400" />
                <span>Audit & State Transition History</span>
              </div>
              <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2">
                {event.history.map(item => (
                  <div key={item.history_id} className="relative pb-2">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
                    <p className="text-xs font-semibold text-slate-800">
                      Changed from <span className="font-mono text-slate-600">{item.old_status || 'INIT'}</span> to{' '}
                      <span className="font-mono text-brand-700 font-bold">{item.new_status}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      By {item.changed_by} &bull; {formatDateTime(item.changed_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <span className="text-xs text-slate-500">
            Validated by <span className="font-semibold text-brand-700">Java OOP Engine</span> &bull; Recorded in DB
          </span>
          <div className="flex items-center space-x-2">
            {event.status === 'ACTIVE' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatus('ACKNOWLEDGED')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-50 transition-colors"
              >
                <UserCheck className="h-4 w-4" />
                Acknowledge Alert
              </button>
            )}
            {event.status !== 'RESOLVED' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatus('RESOLVED')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Resolve Incident
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

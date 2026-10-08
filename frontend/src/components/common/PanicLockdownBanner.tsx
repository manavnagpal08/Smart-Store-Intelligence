import React from 'react';
import { ShieldAlert, AlertOctagon, VolumeX, ShieldCheck, Radio } from 'lucide-react';
import { startLockdownSiren, stopLockdownSiren, speakFloorAnnouncement } from '../../utils/audioAlarm';

interface Props {
  isLockdown: boolean;
  onToggleLockdown: () => void;
}

export const PanicLockdownBanner: React.FC<Props> = ({ isLockdown, onToggleLockdown }) => {
  const handleActivate = () => {
    startLockdownSiren();
    speakFloorAnnouncement(
      'EMERGENCY LOCKDOWN INITIATED. ALL STORE EXITS MONITORED. SECURITY PROCEED TO RESTRICTED SECTORS.',
      true
    );
    onToggleLockdown();
  };

  const handleDeactivate = () => {
    stopLockdownSiren();
    speakFloorAnnouncement(
      'Emergency protocol cleared. Resuming nominal store operations.',
      true
    );
    onToggleLockdown();
  };

  if (!isLockdown) {
    return (
      <div className="glass-panel flex flex-wrap items-center justify-between p-3.5 rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50/70 via-white to-amber-50/50 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-700 shadow-2xs">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-900 block">
              Emergency Fast-Action Protocol
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              1-Click armed lock-in, dual-frequency audio siren & floor strobe dispatch
            </span>
          </div>
        </div>

        <button
          onClick={handleActivate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700 shadow-xs transition-colors"
        >
          <AlertOctagon className="h-3.5 w-3.5" />
          <span>Trigger Panic / Lockdown</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl border-2 border-red-500 bg-red-600 text-white shadow-lg animate-pulse flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600 shadow-md">
          <AlertOctagon className="h-6 w-6 animate-spin" />
        </div>
        <div>
          <span className="text-sm font-black uppercase tracking-widest text-white block">
            EMERGENCY LOCKDOWN PROTOCOL ACTIVE
          </span>
          <span className="text-xs text-red-100">
            Audio siren broadcasting &bull; All restricted breaches flagged &bull; High-priority dispatch active
          </span>
        </div>
      </div>

      <button
        onClick={handleDeactivate}
        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-700 hover:bg-red-50 shadow-md transition-colors"
      >
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>Disarm & Resume Normal</span>
      </button>
    </div>
  );
};

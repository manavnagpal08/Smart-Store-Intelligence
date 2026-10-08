import React, { useState } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  X,
  Send,
  Radio,
  Sliders,
  CheckCircle2,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { speakFloorAnnouncement, playAudioChime } from '../../utils/audioAlarm';

interface Props {
  onClose: () => void;
}

export const VoicePADispatcherModal: React.FC<Props> = ({ onClose }) => {
  const [announcementText, setAnnouncementText] = useState<string>(
    'Attention store personnel: Queue congestion detected at Cashier Lane 1. Please deploy secondary checkout associate.'
  );
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastLog, setBroadcastLog] = useState<string[]>([]);

  const quickBroadcastTemplates = [
    {
      title: 'Cashier Queue Support',
      text: 'Attention store staff: Queue congestion detected at Cashier Lane 1. Please open secondary register.',
      category: 'Operations',
    },
    {
      title: 'Restricted Vault Alert',
      text: 'Security dispatch: Restricted area breach detected at Back Storage Vault. Security team respond immediately.',
      category: 'Security',
    },
    {
      title: 'Aisle Congestion Notice',
      text: 'Store operations: Aisle obstruction reported in Grocery Aisle A. Maintenance associate please investigate.',
      category: 'Maintenance',
    },
    {
      title: 'Store Closing Announcement',
      text: 'Attention valued customers: SmartStore will be closing in 15 minutes. Please bring selections to the nearest register.',
      category: 'Customer',
    },
  ];

  const handleBroadcast = async (customText?: string) => {
    const textToSend = customText || announcementText;
    if (!textToSend.trim()) return;

    setIsBroadcasting(true);
    playAudioChime('warning');

    await new Promise(r => setTimeout(r, 300));
    await speakFloorAnnouncement(textToSend, true);

    setIsBroadcasting(false);
    setBroadcastLog(prev => [
      `[${new Date().toLocaleTimeString()}] Broadcasted: "${textToSend}"`,
      ...prev.slice(0, 4),
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl bg-white text-slate-900 overflow-hidden my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-600 text-white shadow-xs">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Floor Intercom & Speech Synthesizer PA System</h3>
              <p className="text-[11px] text-slate-500">Live text-to-speech synthesized audio broadcasting to retail ceiling speakers</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Quick Dispatch Preset Buttons */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Quick Operations & Security Presets
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {quickBroadcastTemplates.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setAnnouncementText(tpl.text);
                    handleBroadcast(tpl.text);
                  }}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 text-left hover:bg-brand-50/80 hover:border-brand-300 transition-all shadow-2xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-brand-800">{tpl.title}</span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {tpl.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">{tpl.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Announcement Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Custom Spoken Announcement Input
            </label>
            <textarea
              rows={3}
              value={announcementText}
              onChange={e => setAnnouncementText(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white p-3.5 text-xs text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none leading-relaxed"
              placeholder="Type any security or operational instruction to broadcast..."
            />
          </div>

          {/* Broadcast Log */}
          {broadcastLog.length > 0 && (
            <div className="rounded-xl bg-slate-100/80 border border-slate-200 p-3 space-y-1 text-[11px] font-mono text-slate-700">
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[10px]">Recent Spoken Broadcasts:</span>
              {broadcastLog.map((log, i) => (
                <div key={i} className="truncate text-slate-600">{log}</div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-brand-600" />
              Direct browser speech synthesis output
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Close
              </button>
              <button
                onClick={() => handleBroadcast()}
                disabled={isBroadcasting}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-800 shadow-xs transition-colors disabled:opacity-50"
              >
                <Radio className={`h-3.5 w-3.5 ${isBroadcasting ? 'animate-pulse text-amber-300' : ''}`} />
                <span>{isBroadcasting ? 'Broadcasting to PA...' : 'Broadcast Floor PA Audio'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

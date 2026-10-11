import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  AlertTriangle,
  Camera,
  BarChart3,
  Settings,
  Activity,
  X,
  ListFilter,
  HeartPulse,
  ShieldAlert,
  Radio,
  DollarSign,
  Sliders
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/live-monitoring', label: 'Live Monitoring', icon: Video },
  { path: '/alerts', label: 'Alerts & Incidents', icon: AlertTriangle, hasBadge: true },
  { path: '/evidence', label: 'Evidence Vault', icon: ShieldAlert },
  { path: '/dispatch', label: 'Guard Dispatch', icon: Radio },
  { path: '/loss-prevention', label: 'Loss Prevention ROI', icon: DollarSign },
  { path: '/cameras', label: 'Cameras & Devices', icon: Camera },
  { path: '/zone-policies', label: 'Zone Policies', icon: Sliders },
  { path: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { path: '/activity', label: 'Activity Timeline', icon: ListFilter },
  { path: '/system-status', label: 'System Health', icon: HeartPulse },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeEvents, health } = useStore();
  const safeActiveEvents = Array.isArray(activeEvents) ? activeEvents : [];
  const criticalCount = safeActiveEvents.filter(e => e.severity === 'CRITICAL').length;
  const totalActive = safeActiveEvents.length;
  const isHealthy = health?.status === 'healthy' && health?.database === 'connected';

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white text-slate-700 flex-col justify-between border-r border-slate-200 select-none shadow-xs z-20">
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200 bg-white">
            <div className="flex items-center space-x-3">
              <img src="/brand/smartstore-mark.png" alt="" className="h-10 w-10 object-contain" />
              <div>
                <span className="text-sm font-bold text-slate-900 tracking-tight block">SmartStore AI</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Enterprise Security
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.hasBadge && totalActive > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-blue-500 text-white'
                              : criticalCount > 0
                              ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {totalActive}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Clean System Status Footprint */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-600" />
              System Status
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
              {isHealthy ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {health ? 'Degraded' : 'Offline'}
                </>
              )}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-600">
              <span>FastAPI Vision Core</span>
              <span className="font-mono text-slate-900 font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                {health?.status === 'healthy' ? 'Healthy' : health?.status || 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Store Database</span>
              <span className="font-mono text-slate-900 font-semibold capitalize bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                {health?.database || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Java Validator</span>
              <span className={`font-mono font-semibold capitalize px-1.5 py-0.5 rounded border ${
                health?.java_module === 'available'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}>
                {health?.java_module || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 border-r border-slate-200">
            <div>
              <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 bg-slate-50/80">
                <div className="flex items-center space-x-2.5">
                  <img src="/brand/smartstore-mark.png" alt="" className="h-9 w-9 object-contain" />
                  <span className="font-bold text-slate-900 text-sm">SmartStore</span>
                </div>
                <button
                  onClick={onCloseMobile}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="p-3 space-y-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-brand-50 text-brand-800 border-l-4 border-brand-700 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-4 w-4 text-slate-500" />
                        <span>{item.label}</span>
                      </div>
                      {item.hasBadge && totalActive > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800">
                          {totalActive}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/80 text-[11px] text-slate-500">
              <span>Smart Store AI Operations &bull; Mobile Ready</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

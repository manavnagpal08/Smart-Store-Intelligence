import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  AlertTriangle,
  Camera,
  BarChart3,
  Settings,
  Shield,
  Activity,
  X
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/live-monitoring', label: 'Live Monitoring', icon: Video },
  { path: '/alerts', label: 'Alerts & Incidents', icon: AlertTriangle, hasBadge: true },
  { path: '/cameras', label: 'Cameras & Zones', icon: Camera },
  { path: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
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

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 glass-nav text-slate-700 flex-col justify-between border-r border-slate-200/80 select-none shadow-xs z-20">
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200/60 bg-white/40">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-600 text-white shadow-sm shadow-brand-500/20">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 tracking-tight block">SmartStore</span>
                <span className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">
                  Retail Intelligence
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-50/90 text-brand-800 font-semibold border-l-4 border-brand-700 shadow-xs backdrop-blur-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4 flex-shrink-0 text-slate-500" />
                    <span>{item.label}</span>
                  </div>
                  {item.hasBadge && totalActive > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${
                        criticalCount > 0
                          ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
                          : 'bg-brand-100 text-brand-700 border border-brand-200'
                      }`}
                    >
                      {totalActive}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Clean System Status Footprint */}
        <div className="p-4 border-t border-slate-200/60 bg-white/40 backdrop-blur-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-brand-700" />
              System Status
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
              {health?.status === 'healthy' ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Syncing
                </>
              )}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-600">
              <span>FastAPI Core</span>
              <span className="font-mono text-slate-900 font-semibold bg-slate-100/80 px-1.5 py-0.5 rounded">
                {health ? '8000 OK' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Store DB</span>
              <span className="font-mono text-slate-900 font-semibold capitalize bg-slate-100/80 px-1.5 py-0.5 rounded">
                {health?.database || 'Connected'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Java Rules</span>
              <span className="font-mono text-brand-700 font-semibold bg-brand-50 px-1.5 py-0.5 rounded">Active</span>
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-700 text-white shadow-xs">
                    <Shield className="h-4 w-4" />
                  </div>
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

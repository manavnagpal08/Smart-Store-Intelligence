import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, Bell, Shield, Wifi, WifiOff, Menu, Maximize2, Minimize2, Zap } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onToggleMobileMenu }) => {
  const { activeEvents, health, isRefreshing, refreshData, lastUpdated } = useStore();
  const [time, setTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const criticalCount = (Array.isArray(activeEvents) ? activeEvents : []).filter(e => e.severity === 'CRITICAL').length;

  return (
    <header className="h-16 flex-shrink-0 glass-panel border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs z-10">
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="truncate">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Edge Engine Latency */}
        <div className="hidden xl:flex items-center space-x-1.5 rounded-xl bg-purple-50/80 border border-purple-200/60 px-2.5 py-1.5 text-[11px] font-semibold text-purple-800 shadow-2xs">
          <Zap className="h-3 w-3 text-purple-600" />
          <span>Edge CV: 16ms</span>
        </div>

        {/* Live Clock */}
        <div className="hidden lg:flex items-center space-x-1.5 rounded-xl bg-slate-100/80 backdrop-blur-xs border border-slate-200/60 px-3 py-1.5 text-xs font-mono font-semibold text-slate-700 shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>{time}</span>
        </div>

        {/* Backend Connectivity Status */}
        <div className="hidden sm:flex items-center space-x-1.5 rounded-xl border border-slate-200/70 bg-white/70 backdrop-blur-xs px-3 py-1.5 text-xs font-semibold shadow-2xs">
          {health?.status === 'healthy' ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-slate-700">Connected</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-slate-700">Syncing</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            </>
          )}
        </div>

        {/* Alert Indicator */}
        <div
          className={`flex items-center space-x-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold shadow-2xs ${
            criticalCount > 0
              ? 'bg-red-50/90 text-red-700 border border-red-200 animate-pulse'
              : activeEvents.length > 0
              ? 'bg-amber-50/90 text-amber-700 border border-amber-200'
              : 'bg-emerald-50/90 text-emerald-700 border border-emerald-200'
          }`}
        >
          {criticalCount > 0 ? (
            <Shield className="h-3.5 w-3.5 text-red-600" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          <span className="text-[11px] sm:text-xs">
            {criticalCount > 0
              ? `${criticalCount} Critical`
              : activeEvents.length > 0
              ? `${activeEvents.length} Alerts`
              : 'Store Safe'}
          </span>
        </div>

        {/* Fullscreen SOC Toggle */}
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen Security Console"
          className="hidden sm:flex items-center rounded-xl border border-slate-200/80 bg-white/80 p-2 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>

        {/* Refresh Button */}
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          title={`Last updated: ${lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}`}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-xs p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-700 transition-colors shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-brand-600' : ''}`} />
          <span className="hidden md:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};

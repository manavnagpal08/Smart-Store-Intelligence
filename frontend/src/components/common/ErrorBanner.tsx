import React from 'react';
import { AlertTriangle, RefreshCw, Sparkles, Cloud } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  const isWarmingUp = message.toLowerCase().includes('waking up') ||
                      message.toLowerCase().includes('cold start') ||
                      message.toLowerCase().includes('simulation') ||
                      message.toLowerCase().includes('spinning up');

  if (isWarmingUp) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-sky-900 shadow-xs backdrop-blur-xs">
        <div className="flex items-center space-x-3">
          <Cloud className="h-4 w-4 text-sky-600 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-xs font-semibold">{message}</p>
            <span className="text-[10px] text-sky-700">All local operational features & detection tools remain active.</span>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 px-3 py-1 text-xs font-semibold text-sky-800 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Check Live Cloud
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <div className="flex items-center space-x-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};

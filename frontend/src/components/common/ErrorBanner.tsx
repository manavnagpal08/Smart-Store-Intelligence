import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
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

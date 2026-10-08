import React from 'react';
import { EventSeverity } from '../../types';
import { getSeverityBadgeStyle } from '../../utils/formatters';

interface SeverityBadgeProps {
  severity: EventSeverity | string;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  showDot = true,
  size = 'md',
}) => {
  const style = getSeverityBadgeStyle(severity);
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${style.bg} ${sizeClasses[size]} transition-all`}
    >
      {showDot && (
        <span
          className={`h-2 w-2 rounded-full ${style.dot} ${
            severity === 'CRITICAL' ? 'animate-pulse' : ''
          }`}
        />
      )}
      <span>{severity?.toUpperCase()}</span>
    </span>
  );
};

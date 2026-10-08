import React from 'react';
import { EventStatus } from '../../types';
import { getStatusBadgeStyle } from '../../utils/formatters';

interface StatusBadgeProps {
  status: EventStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const badgeStyle = getStatusBadgeStyle(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center rounded-md border font-medium ${badgeStyle} ${sizeClasses}`}>
      {status?.toUpperCase()}
    </span>
  );
};

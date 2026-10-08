import { EventSeverity, EventStatus, EventType } from '../types';

export function formatTimeAgo(timestampStr: string): string {
  try {
    const date = new Date(timestampStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hr ago`;
    return date.toLocaleDateString();
  } catch {
    return timestampStr;
  }
}

export function formatDateTime(timestampStr: string): string {
  try {
    const d = new Date(timestampStr);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return timestampStr;
  }
}

export function formatEventType(type: EventType | string): string {
  switch (type) {
    case 'CROWD_DENSITY':
      return 'Crowd Density';
    case 'QUEUE_CONGESTION':
      return 'Queue Congestion';
    case 'RESTRICTED_AREA_ENTRY':
      return 'Restricted Area Entry';
    case 'AISLE_OBSTRUCTION':
      return 'Aisle Obstruction';
    default:
      return type.replace(/_/g, ' ');
  }
}

export function getSeverityBadgeStyle(severity: EventSeverity | string) {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return {
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-600',
        cardBorder: 'border-l-red-600',
        text: 'text-red-700',
      };
    case 'HIGH':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-600',
        cardBorder: 'border-l-rose-600',
        text: 'text-rose-700',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        cardBorder: 'border-l-amber-500',
        text: 'text-amber-700',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        cardBorder: 'border-l-blue-500',
        text: 'text-blue-700',
      };
  }
}

export function getStatusBadgeStyle(status: EventStatus | string) {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'ACKNOWLEDGED':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

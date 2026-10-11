import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  accentColor?: 'purple' | 'burgundy' | 'amber' | 'blue' | 'red' | 'emerald';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'blue',
  onClick,
}) => {
  const colorMap = {
    purple: {
      iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
      border: 'hover:border-slate-400',
    },
    burgundy: {
      iconBg: 'bg-rose-50 text-rose-700 border border-rose-200',
      border: 'hover:border-rose-300',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-700 border border-amber-200',
      border: 'hover:border-amber-300',
    },
    blue: {
      iconBg: 'bg-blue-50 text-blue-700 border border-blue-200',
      border: 'hover:border-blue-300',
    },
    red: {
      iconBg: 'bg-red-50 text-red-700 border border-red-200',
      border: 'hover:border-red-300',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      border: 'hover:border-emerald-300',
    },
  };

  const scheme = colorMap[accentColor] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-150 hover:shadow-sm ${
        onClick ? 'cursor-pointer ' + scheme.border : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
            {trend && (
              <span
                className={`text-xs font-semibold ${
                  trend.isPositive
                    ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded'
                    : trend.isNeutral
                    ? 'text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded'
                    : 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${scheme.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

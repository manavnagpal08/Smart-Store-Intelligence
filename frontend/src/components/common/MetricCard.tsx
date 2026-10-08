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
  accentColor = 'purple',
  onClick,
}) => {
  const colorMap = {
    purple: {
      iconBg: 'bg-purple-100/80 text-purple-700 border border-purple-200/60 shadow-xs',
      border: 'hover:border-purple-300/80',
      accent: 'from-purple-600 to-indigo-600',
    },
    burgundy: {
      iconBg: 'bg-pink-100/80 text-pink-700 border border-pink-200/60 shadow-xs',
      border: 'hover:border-pink-300/80',
      accent: 'from-pink-600 to-rose-600',
    },
    amber: {
      iconBg: 'bg-amber-100/80 text-amber-700 border border-amber-200/60 shadow-xs',
      border: 'hover:border-amber-300/80',
      accent: 'from-amber-500 to-orange-500',
    },
    blue: {
      iconBg: 'bg-blue-100/80 text-blue-700 border border-blue-200/60 shadow-xs',
      border: 'hover:border-blue-300/80',
      accent: 'from-blue-600 to-cyan-600',
    },
    red: {
      iconBg: 'bg-red-100/80 text-red-700 border border-red-200/60 shadow-xs',
      border: 'hover:border-red-300/80',
      accent: 'from-red-600 to-rose-600',
    },
    emerald: {
      iconBg: 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60 shadow-xs',
      border: 'hover:border-emerald-300/80',
      accent: 'from-emerald-600 to-teal-600',
    },
  };

  const scheme = colorMap[accentColor] || colorMap.purple;

  return (
    <div
      onClick={onClick}
      className={`glass-panel relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 ${
        onClick ? 'cursor-pointer hover:shadow-md ' + scheme.border : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</span>
            {trend && (
              <span
                className={`text-xs font-semibold ${
                  trend.isNeutral
                    ? 'text-slate-500'
                    : trend.isPositive
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${scheme.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${scheme.accent} opacity-90`} />
    </div>
  );
};

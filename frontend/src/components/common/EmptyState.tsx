import React from 'react';
import { LucideIcon, ShieldCheck } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = ShieldCheck,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

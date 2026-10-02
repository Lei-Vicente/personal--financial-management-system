import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryIcon?: LucideIcon;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryIcon: SecondaryIcon,
  className = ''
}) => {
  return (
    <div className={`py-12 px-6 flex flex-col items-center text-center bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl shadow-xs ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[#F5F5F3] flex items-center justify-center text-[#111111] mb-5 border border-[#D9D9D4]/50">
        <Icon className="w-5 h-5 stroke-[2]" />
      </div>
      <h3 className="text-base font-bold text-[#111111] mb-1.5 tracking-tight">{title}</h3>
      <p className="text-sm text-[#6B6B67] max-w-sm mx-auto leading-relaxed mb-6">
        {description}
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="px-5 py-2.5 bg-[#111111] hover:bg-[#333333] text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98] premium-interactive"
          >
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="px-5 py-2.5 bg-[#FFFFFF] border border-[#D9D9D4] hover:bg-[#F5F5F3] text-[#111111] rounded-xl text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] premium-interactive flex items-center gap-2 shadow-xs"
          >
            {SecondaryIcon && <SecondaryIcon className="w-4 h-4" />}
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

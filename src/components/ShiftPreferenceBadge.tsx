import React from 'react';
import { Sun, Moon, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { ShiftPreference } from '../types';

interface ShiftPreferenceBadgeProps {
  shift?: ShiftPreference | string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showNotSet?: boolean;
  className?: string;
}

export const ShiftPreferenceBadge: React.FC<ShiftPreferenceBadgeProps> = ({
  shift,
  size = 'sm',
  showNotSet = true,
  className
}) => {
  const normalized = (shift || '').trim();
  const isDay = normalized === 'Day Shift';
  const isNight = normalized === 'Night Shift';
  const isNotSet = !isDay && !isNight;

  if (isNotSet && !showNotSet) {
    return null;
  }

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-xs sm:text-sm gap-2'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  let badgeColor = '';
  let IconComponent = Clock;
  let label = 'Not Set';

  if (isDay) {
    label = 'Day Shift';
    IconComponent = Sun;
    badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/15';
  } else if (isNight) {
    label = 'Night Shift';
    IconComponent = Moon;
    badgeColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/15';
  } else {
    label = 'Not Set';
    IconComponent = Clock;
    badgeColor = 'bg-bg-tertiary text-text-muted border-border-primary hover:text-text-secondary';
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold uppercase tracking-wider rounded-full border whitespace-nowrap shadow-xs transition-colors",
        badgeColor,
        sizeClasses[size],
        className
      )}
      title={`Shift Preference: ${label}`}
    >
      <IconComponent className={cn(iconSizes[size], "flex-shrink-0")} />
      <span>{label}</span>
    </span>
  );
};

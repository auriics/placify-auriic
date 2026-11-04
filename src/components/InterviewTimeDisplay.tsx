import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { formatInterviewSlotRange, cn } from '../lib/utils';

export interface InterviewTimeDisplayProps {
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  className?: string;
  badgeClassName?: string;
  dateClassName?: string;
  showIcon?: boolean;
  showDuration?: boolean;
  inline?: boolean;
}

export const InterviewTimeDisplay: React.FC<InterviewTimeDisplayProps> = ({
  startTime,
  endTime,
  durationMinutes,
  className,
  badgeClassName,
  dateClassName,
  showIcon = true,
  showDuration = true,
  inline = false,
}) => {
  const slot = formatInterviewSlotRange(startTime, endTime, durationMinutes);

  if (!startTime) {
    return (
      <span className={cn("text-xs font-bold text-text-muted italic", className)}>
        Not Scheduled
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        inline ? "inline-flex" : "",
        className
      )}
    >
      <div className={cn("flex items-center gap-1.5 text-xs font-bold text-text-primary shrink-0", dateClassName)}>
        {showIcon && <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />}
        <span>{slot.dateStr}</span>
      </div>

      {slot.hasTime ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-black tracking-wide shrink-0",
            badgeClassName
          )}
        >
          <Clock className="w-3 h-3 text-accent-blue shrink-0" />
          <span>{slot.timeRangeStr}</span>
          {showDuration && (
            <span className="text-[10px] font-bold text-accent-blue/80 opacity-90">
              ({slot.durationMinutes}m)
            </span>
          )}
        </span>
      ) : (
        <span className="text-xs text-text-muted italic font-medium">
          {slot.timeRangeStr}
        </span>
      )}
    </div>
  );
};

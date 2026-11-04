import React, { useMemo } from 'react';
import { InterviewRound, ProxyAvailability, User } from '../types';
import { cn, parseLocalTimeToDate, getEasternDate, isUserOnLeaveDuring } from '../lib/utils';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface SlotVisualizerProps {
  rounds: InterviewRound[];
  availabilities: ProxyAvailability[];
  date: Date;
  proxyId?: string;
  proxyUser?: User;
}

export const SlotVisualizer: React.FC<SlotVisualizerProps> = ({ rounds, availabilities, date, proxyId, proxyUser }) => {
  const dateStr = useMemo(() => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date), [date]);

  const isOnLeaveDay = useMemo(() => {
    if (proxyUser) {
      return isUserOnLeaveDuring(proxyUser, dateStr);
    }
    return availabilities.some(a =>
      (proxyId ? String(a.proxy_user_id) === proxyId : true) &&
      a.slot_start?.startsWith(dateStr) &&
      (a.slot_status === 'leave' || a.slot_status === 'unavailable')
    );
  }, [proxyUser, dateStr, availabilities, proxyId]);

  const sortedSlots = useMemo(() => {
    // Available slots
    const available = availabilities
      .filter(a => 
        (proxyId ? String(a.proxy_user_id) === proxyId : true) &&
        a.slot_start?.startsWith(dateStr) && a.slot_status === 'available')
      .map(a => ({
        id: a.id,
        type: 'available' as const,
        start: a.slot_start,
        end: a.slot_end,
      }));

    // Leave / Unavailable slots
    const leaveSlots = availabilities
      .filter(a =>
        (proxyId ? String(a.proxy_user_id) === proxyId : true) &&
        a.slot_start?.startsWith(dateStr) && (a.slot_status === 'leave' || a.slot_status === 'unavailable'))
      .map(a => ({
        id: a.id,
        type: 'leave' as const,
        start: a.slot_start,
        end: a.slot_end,
        reason: a.leave_reason || 'On Leave'
      }));

    // Booked slots
    const booked = rounds
      .filter(r => 
        (proxyId ? String(r.proxy_user_id) === proxyId : true) &&
        (r.booked_slot_time || r.interview_date)?.startsWith(dateStr) && r.status !== 'cancelled')
      .map(r => ({
        id: r.id,
        type: 'booked' as const,
        start: r.booked_slot_time || r.interview_date || '',
        end: r.booked_slot_end || '',
        roundLabel: r.round_label,
      }));

    return [...available, ...leaveSlots, ...booked].sort((a, b) => a.start.localeCompare(b.start));
  }, [rounds, availabilities, dateStr, proxyId]);

  const bookedOnLeaveDay = useMemo(() => {
    if (!isOnLeaveDay) return [];
    return sortedSlots.filter(s => s.type === 'booked');
  }, [isOnLeaveDay, sortedSlots]);

  return (
    <div className="bg-bg-secondary p-6 rounded-3xl border border-border-primary/50 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent-blue" />
          Schedule for {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })} (EST)
        </h3>
        {isOnLeaveDay && (
          <span className="self-start sm:self-auto px-3 py-1 bg-accent-amber/15 text-accent-amber text-[10px] font-black rounded-full border border-accent-amber/30 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
            On Leave / Unavailable
          </span>
        )}
      </div>

      {isOnLeaveDay && (
        <div className="mb-5 p-4 bg-accent-amber/10 border border-accent-amber/25 rounded-2xl flex items-start gap-3">
          <span className="text-lg leading-none mt-0.5">🌴</span>
          <div className="flex-1">
            <p className="text-xs font-black text-accent-amber uppercase tracking-wider">
              {proxyUser?.display_name || 'Team Member'} is On Leave for this Date
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              Marked as <strong>On Leave / Unavailable</strong>. New interview bookings and assignments are blocked for this period.
            </p>
          </div>
        </div>
      )}

      {bookedOnLeaveDay.length > 0 && (
        <div className="mb-5 p-4 bg-accent-red/10 border border-accent-red/25 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-black text-accent-red uppercase tracking-wider">
              Scheduling Conflict Notice
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              {bookedOnLeaveDay.length} existing interview booking(s) fall on this leave date. Existing bookings are preserved. Please reassign the proxy if coverage is needed.
            </p>
          </div>
        </div>
      )}
      
      {sortedSlots.length === 0 ? (
        <p className="text-xs text-text-muted italic">
          {isOnLeaveDay ? 'No available slots — member is on leave.' : 'No slots scheduled for this day.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {sortedSlots.map(slot => (
            <div 
              key={slot.id}
              className={cn(
                "p-4 rounded-2xl border transition-all",
                slot.type === 'available' 
                  ? "bg-accent-green/5 border-accent-green/20" 
                  : slot.type === 'leave'
                  ? "bg-accent-amber/5 border-accent-amber/20"
                  : "bg-accent-blue/5 border-accent-blue/20"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className={cn(
                  "w-3.5 h-3.5",
                  slot.type === 'available' ? "text-accent-green" : slot.type === 'leave' ? "text-accent-amber" : "text-accent-blue"
                )} />
                <span className={cn(
                  "text-xs font-bold",
                  slot.type === 'available' ? "text-accent-green" : slot.type === 'leave' ? "text-accent-amber" : "text-accent-blue"
                )}>
                  {slot.start && !isNaN(parseLocalTimeToDate(slot.start, 'America/New_York').getTime()) 
                    ? new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/New_York',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }).format(parseLocalTimeToDate(slot.start, 'America/New_York'))
                    : 'N/A'} EST
                  {' - '}
                  {slot.end && !isNaN(parseLocalTimeToDate(slot.end, 'America/New_York').getTime())
                    ? new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/New_York',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }).format(parseLocalTimeToDate(slot.end, 'America/New_York'))
                    : 'N/A'} EST
                </span>
              </div>
              <p className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                slot.type === 'available' 
                  ? "text-accent-green/70" 
                  : slot.type === 'leave'
                  ? "text-accent-amber font-bold"
                  : "text-accent-blue/70"
              )}>
                {slot.type === 'available' ? 'Available' : slot.type === 'leave' ? 'On Leave / Unavailable' : `Booked: ${slot.roundLabel || 'Interview'}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

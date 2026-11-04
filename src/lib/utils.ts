import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EASTERN_TIME_ZONE = 'America/New_York';

export const getCurrentEasternISOString = (): string => {
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: EASTERN_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const formatted = formatter.format(new Date());
    return formatted.replace(' ', 'T');
  } catch (e) {
    const estDateString = new Date().toLocaleString("en-US", { timeZone: EASTERN_TIME_ZONE });
    const d = new Date(estDateString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${dd}T${hh}:${mm}:${ss}`;
  }
};

export const getEasternDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EASTERN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

export const getCurrentEasternHourAndMinute = (): { hour: number; minute: number } => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: EASTERN_TIME_ZONE,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    let hour = 12;
    let minute = 0;
    
    parts.forEach(p => {
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    });
    
    return { hour, minute };
  } catch (e) {
    const date = new Date();
    // basic fallback
    return { hour: date.getHours(), minute: date.getMinutes() };
  }
};

export const isEasternDayOngoing = (checkDateStr: string): boolean => {
  const todayStr = getEasternDate();
  if (checkDateStr !== todayStr) return false;
  
  const { hour, minute } = getCurrentEasternHourAndMinute();
  const timeVal = hour * 100 + minute;
  return timeVal < 1815; // 18:15 is 6:15 PM
};

/**
 * Validates if the given date/time is within Sales Person working hours:
 * Monday through Friday, 9:30 AM to 6:30 PM Eastern Time (America/New_York).
 */
export const isSalesWorkingHours = (date: Date = new Date()): boolean => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: EASTERN_TIME_ZONE,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    let weekday = '';
    let hour = 0;
    let minute = 0;

    parts.forEach(p => {
      if (p.type === 'weekday') weekday = p.value;
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    });

    const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
    if (!isWeekday) return false;

    // 9:30 AM = 570 mins, 6:30 PM = 1110 mins
    const totalMinutes = hour * 60 + minute;
    return totalMinutes >= 570 && totalMinutes <= 1110;
  } catch (e) {
    console.error('Error checking sales working hours:', e);
    return false;
  }
};

export const getEasternTimeString = (date: Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: EASTERN_TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (e) {
    return date.toLocaleTimeString();
  }
};


export const getLocalYYYYMMDD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function parseLocalTimeToDate(localStr: string, timeZone: string = 'America/New_York'): Date {
  const parts = localStr.split('T');
  const dateParts = parts[0].split('-');
  const timeParts = (parts[1] || '00:00:00').split(':');
  
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  const hour = parseInt(timeParts[0], 10);
  const minute = parseInt(timeParts[1], 10);
  const second = parseInt(timeParts[2] || '0', 10);
  
  let utcGuess = new Date(Date.UTC(year, month, day, hour, minute, second));
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    
    const partsOfFormatted = formatter.formatToParts(utcGuess);
    const getPartVal = (type: Intl.DateTimeFormatPartTypes) => 
      parseInt(partsOfFormatted.find(p => p.type === type)?.value || '0', 10);
    
    const formattedYear = getPartVal('year');
    const formattedMonth = getPartVal('month');
    const formattedDay = getPartVal('day');
    const formattedHour = getPartVal('hour');
    const formattedMinute = getPartVal('minute');
    
    const formattedLocal = Date.UTC(
      formattedYear, formattedMonth - 1, formattedDay,
      formattedHour % 24, formattedMinute, 0
    );
    
    const originalWantedLocal = Date.UTC(year, month, day, hour, minute, 0);
    const diffMs = originalWantedLocal - formattedLocal;
    
    return new Date(utcGuess.getTime() + diffMs);
  } catch (e) {
    return new Date(year, month, day, hour, minute, second);
  }
}

export interface CalendarDate {
  dateStr: string;
  year: number;
  month: number;
  day: number;
  weekdayShort: string;
  weekdayLong: string;
  monthLong: string;
}

export function getCalendarDateInfo(dateStr: string): CalendarDate {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  // Construct a Date object representing UTC noon to completely avoid any edge case or DST transitions
  const dateUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  
  // Format the elements in UTC timezone to be 100% timezone-safe
  const weekdayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dateUtc);
  const weekdayLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(dateUtc);
  const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(dateUtc);
  
  return {
    dateStr,
    year,
    month,
    day,
    weekdayShort,
    weekdayLong,
    monthLong
  };
}

export const formatDisplayDateWithWeekday = (dateStr: string | undefined | null, timeZone: string = 'America/New_York'): string => {
  if (!dateStr) return 'N/A';
  try {
    const pureDateParts = dateStr.split('-');
    if (pureDateParts.length === 3 && !dateStr.includes('T')) {
      const info = getCalendarDateInfo(dateStr);
      return `${info.weekdayShort}, ${info.monthLong} ${info.day}, ${info.year}`;
    }
    
    const cleanStr = dateStr.includes('.') ? dateStr.split('.')[0] : dateStr;
    const date = parseLocalTimeToDate(cleanStr, timeZone);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return dateStr;
  }
};

export const formatDisplayDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return 'N/A';
  // If it's YYYY-MM-DD, parse manually to avoid local timezone shift
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${month}/${day}/${year}`;
  }
  // Fallback for other formats
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      timeZone: EASTERN_TIME_ZONE
    });
  } catch (e) {
    return dateStr;
  }
};

/**
 * Detects whether a candidate is exclusively from the Interview Support System
 * (e.g. self-booked via Direct Interview Support form) and should not be tracked
 * in Recruiter Compliance Central or Performance reports.
 */
export const isDirectInterviewSupportCandidate = (c: any): boolean => {
  if (!c) return false;

  if (c.is_direct_interview_support === true) {
    return true;
  }

  const domain = String(c.domain_interested || '').toLowerCase().trim();
  if (domain.includes('interview support')) {
    return true;
  }

  const leadSource = String(c.lead_source || '').toLowerCase().trim();
  if (leadSource.includes('interview support')) {
    return true;
  }

  const pkg = String(c.package_name || '').toLowerCase().trim();
  if (
    pkg === 'interview support' ||
    pkg === 'direct interview support' ||
    pkg === 'aurrum interview support' ||
    pkg.includes('interview support only') ||
    pkg.includes('direct interview support')
  ) {
    return true;
  }

  const notes = String(c.notes || '').toLowerCase();
  if (
    notes.includes('direct interview support') ||
    notes.includes('interview support direct landing form') ||
    notes.includes('interview-support-only') ||
    notes.includes('online direct interview support link')
  ) {
    return true;
  }

  return false;
};



export interface ParsedLeaveRange {
  start: Date;
  end: Date;
}

export function parseLeaveRange(
  startDate?: string | null,
  endDate?: string | null,
  returnDate?: string | null
): ParsedLeaveRange | null {
  const fromStr = startDate || null;
  const toStr = endDate || returnDate || null;

  if (!fromStr && !toStr) {
    return null;
  }

  try {
    let startD: Date;
    let endD: Date;

    if (fromStr) {
      const cleanFrom = fromStr.includes('T') ? fromStr : `${fromStr}T00:00:00`;
      startD = parseLocalTimeToDate(cleanFrom, 'America/New_York');
    } else {
      startD = new Date(0);
    }

    if (toStr) {
      const cleanTo = toStr.includes('T') ? toStr : `${toStr}T23:59:59.999`;
      endD = parseLocalTimeToDate(cleanTo, 'America/New_York');
    } else {
      const cleanTo = fromStr!.includes('T') ? fromStr! : `${fromStr!}T23:59:59.999`;
      endD = parseLocalTimeToDate(cleanTo, 'America/New_York');
    }

    if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
      return null;
    }

    if (startD.getTime() > endD.getTime()) {
      return { start: endD, end: startD };
    }

    return { start: startD, end: endD };
  } catch (e) {
    return null;
  }
}

/**
 * Determines whether a user is on leave during a given target time window [targetStart, targetEnd].
 * Time window comparison is conducted strictly in EST (America/New_York).
 */
export function isUserOnLeaveDuring(
  user: {
    is_on_leave?: boolean;
    leave_start_date?: string | null;
    leave_end_date?: string | null;
    leave_return_date?: string | null;
  } | null | undefined,
  targetStart: Date | string,
  targetEnd?: Date | string
): boolean {
  if (!user) return false;

  let winStart: Date;
  if (typeof targetStart === 'string') {
    winStart = targetStart.includes('T')
      ? parseLocalTimeToDate(targetStart, 'America/New_York')
      : parseLocalTimeToDate(`${targetStart}T00:00:00`, 'America/New_York');
  } else {
    winStart = targetStart;
  }

  let winEnd: Date;
  if (targetEnd) {
    if (typeof targetEnd === 'string') {
      winEnd = targetEnd.includes('T')
        ? parseLocalTimeToDate(targetEnd, 'America/New_York')
        : parseLocalTimeToDate(`${targetEnd}T23:59:59.999`, 'America/New_York');
    } else {
      winEnd = targetEnd;
    }
  } else {
    winEnd = new Date(winStart.getTime() + 30 * 60 * 1000);
  }

  const range = parseLeaveRange(user.leave_start_date, user.leave_end_date, user.leave_return_date);

  if (range) {
    return winStart < range.end && winEnd > range.start;
  }

  if (user.is_on_leave) {
    return true;
  }

  return false;
}

/**
 * Checks if the user is currently on leave at this exact moment in America/New_York (EST).
 */
export function isUserCurrentlyOnLeave(
  user: {
    is_on_leave?: boolean;
    leave_start_date?: string | null;
    leave_end_date?: string | null;
    leave_return_date?: string | null;
  } | null | undefined
): boolean {
  if (!user) return false;
  const nowEst = new Date();
  return isUserOnLeaveDuring(user, nowEst, nowEst);
}

/**
 * Returns a human-friendly label for the user's leave period.
 * e.g., 'Nov 05, 2026 - Nov 08, 2026 (EST)'
 */
export function formatLeavePeriod(
  startDate?: string | null,
  endDate?: string | null,
  returnDate?: string | null
): string {
  const fromStr = startDate || null;
  const toStr = endDate || returnDate || null;

  if (!fromStr && !toStr) return 'Indefinite Leave';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });

  if (!fromStr && toStr) {
    const cleanTo = toStr.includes('T') ? toStr : `${toStr}T00:00:00`;
    const toD = parseLocalTimeToDate(cleanTo, 'America/New_York');
    if (!isNaN(toD.getTime())) {
      return `Until ${formatter.format(toD)} (EST)`;
    }
    return `Until ${toStr} (EST)`;
  }

  if (fromStr && !toStr) {
    const cleanFrom = fromStr.includes('T') ? fromStr : `${fromStr}T00:00:00`;
    const fromD = parseLocalTimeToDate(cleanFrom, 'America/New_York');
    if (!isNaN(fromD.getTime())) {
      return `From ${formatter.format(fromD)} (EST)`;
    }
    return `From ${fromStr} (EST)`;
  }

  const range = parseLeaveRange(fromStr, toStr, returnDate);
  if (!range) {
    if (toStr) return `Until ${toStr} (EST)`;
    return 'Indefinite Leave';
  }

  const fromFormatted = formatter.format(range.start);
  const toFormatted = formatter.format(range.end);

  if (fromFormatted === toFormatted) {
    return `${fromFormatted} (EST)`;
  }

  return `${fromFormatted} - ${toFormatted} (EST)`;
}

export interface FormattedInterviewSlot {
  dateStr: string;
  fromTime: string;
  toTime: string;
  timeRangeStr: string;
  durationMinutes: number;
  fullStr: string;
  hasTime: boolean;
}

/**
 * Formats an interview round's scheduled start and end times into a complete From–To time range in America/New_York (EST/EDT).
 *
 * Example:
 * - dateStr: "Nov 4, 2026"
 * - fromTime: "10:30 AM"
 * - toTime: "11:00 AM"
 * - timeRangeStr: "10:30 AM – 11:00 AM EST"
 * - durationMinutes: 30
 * - fullStr: "Nov 4, 2026, 10:30 AM – 11:00 AM EST"
 */
export function formatInterviewSlotRange(
  startTime?: string | null,
  endTime?: string | null,
  durationMinutes?: number | null
): FormattedInterviewSlot {
  const defaultDuration = durationMinutes && durationMinutes > 0 ? durationMinutes : 30;

  if (!startTime) {
    return {
      dateStr: 'Not Scheduled',
      fromTime: '',
      toTime: '',
      timeRangeStr: 'Time TBD',
      durationMinutes: defaultDuration,
      fullStr: 'Not Scheduled',
      hasTime: false,
    };
  }

  try {
    const rawStart = String(startTime).trim();
    const hasExplicitTime =
      rawStart.includes('T') ||
      (rawStart.includes(' ') && rawStart.split(' ')[1]?.includes(':'));

    const startD = hasExplicitTime
      ? parseLocalTimeToDate(rawStart, 'America/New_York')
      : parseLocalTimeToDate(`${rawStart}T00:00:00`, 'America/New_York');

    if (isNaN(startD.getTime())) {
      return {
        dateStr: startTime,
        fromTime: '',
        toTime: '',
        timeRangeStr: 'Time TBD',
        durationMinutes: defaultDuration,
        fullStr: startTime,
        hasTime: false,
      };
    }

    let endD: Date;
    if (endTime && String(endTime).trim()) {
      const rawEnd = String(endTime).trim();
      const endParsed =
        rawEnd.includes('T') || rawEnd.includes(' ')
          ? parseLocalTimeToDate(rawEnd, 'America/New_York')
          : parseLocalTimeToDate(`${rawEnd}T23:59:59`, 'America/New_York');

      if (!isNaN(endParsed.getTime()) && endParsed.getTime() > startD.getTime()) {
        endD = endParsed;
      } else {
        endD = new Date(startD.getTime() + defaultDuration * 60 * 1000);
      }
    } else {
      endD = new Date(startD.getTime() + defaultDuration * 60 * 1000);
    }

    const calculatedDuration =
      endD.getTime() > startD.getTime()
        ? Math.round((endD.getTime() - startD.getTime()) / (60 * 1000))
        : defaultDuration;

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const dateStr = dateFormatter.format(startD);

    if (!hasExplicitTime) {
      return {
        dateStr,
        fromTime: '',
        toTime: '',
        timeRangeStr: 'Time TBD',
        durationMinutes: calculatedDuration,
        fullStr: `${dateStr} (Time TBD)`,
        hasTime: false,
      };
    }

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const fromTime = timeFormatter.format(startD);
    const toTime = timeFormatter.format(endD);
    const timeRangeStr = `${fromTime} – ${toTime} EST`;
    const fullStr = `${dateStr}, ${timeRangeStr}`;

    return {
      dateStr,
      fromTime,
      toTime,
      timeRangeStr,
      durationMinutes: calculatedDuration,
      fullStr,
      hasTime: true,
    };
  } catch (err) {
    return {
      dateStr: startTime,
      fromTime: '',
      toTime: '',
      timeRangeStr: 'Time TBD',
      durationMinutes: defaultDuration,
      fullStr: startTime,
      hasTime: false,
    };
  }
}

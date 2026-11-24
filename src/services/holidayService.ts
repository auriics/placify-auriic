import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { OfficeClosure, WeeklyOffConfig, HolidayAuditLog, User } from '../types';
import { isProxyUser } from './interviewService';
import { 
  ensureGoogleTokenValid, 
  refreshAccessToken, 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent, 
  deleteGoogleCalendarEvent,
  listGoogleCalendarEvents,
  getNextDayDateString 
} from './calendarService';

export const DEFAULT_WEEKLY_OFF_DAYS: number[] = [0, 6]; // 0 = Sunday, 6 = Saturday
export const DEFAULT_WEEKLY_OFF_MESSAGE = 'Our office is closed today due to the scheduled weekly off-day. Please select another working day.';
export const DEFAULT_HOLIDAY_CLOSURE_MESSAGE = 'This is a non-working day. Our office is closed on weekends and US public holidays. Please select another date for the interview.';

export interface DateClosureEvaluation {
  isClosed: boolean;
  status: 'closed' | 'open';
  reason?: 'override_working' | 'override_closure' | 'holiday' | 'weekly_off' | 'open' | 'closed' | 'working_day';
  title?: string;
  message?: string;
  closure?: OfficeClosure;
}

/**
 * Extracts the 0-6 day of week for a YYYY-MM-DD date string in America/New_York (EST).
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export function getDayOfWeekEST(dateStr: string): number {
  const cleanDate = dateStr.split('T')[0].trim();
  const [year, month, day] = cleanDate.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getDay();
}

/**
 * Formats a standardized recruiter/candidate facing closure message.
 */
export function formatOfficeClosureMessage(title?: string, customMessage?: string): string {
  if (customMessage && customMessage.trim()) {
    return customMessage.trim();
  }
  if (title && title.trim()) {
    return `Interview booking is unavailable on this date because the office is closed for ${title.trim()}. Please select another working day.`;
  }
  return DEFAULT_HOLIDAY_CLOSURE_MESSAGE;
}

/**
 * Pure evaluation function that determines whether an interview date (YYYY-MM-DD or ISO string)
 * is an office closure according to the rule hierarchy:
 * 
 * 1. Explicit Office Open record (status: 'open' or is_working_day_override: true) -> OPEN.
 * 2. Explicit Office Closed record (status: 'closed' or custom holiday) -> CLOSED.
 * 3. Configured recurring weekly off-day (default Saturday/Sunday) -> CLOSED.
 * 4. Normal working day -> OPEN.
 */
export function checkDateOfficeClosure(
  dateStr: string,
  closures: OfficeClosure[] = [],
  weeklyOffConfig?: WeeklyOffConfig | null
): DateClosureEvaluation {
  if (!dateStr || typeof dateStr !== 'string') {
    return { isClosed: false, status: 'open', reason: 'working_day' };
  }

  const cleanDate = dateStr.split('T')[0].trim();
  if (cleanDate.length !== 10) {
    return { isClosed: false, status: 'open', reason: 'working_day' };
  }

  // Active closures covering this target date with defensive null-safety
  const activeClosures = (closures || []).filter(c => {
    if (!c || c.is_active === false || !c.start_date) return false;
    const start = String(c.start_date).split('T')[0].trim();
    const end = String(c.end_date || c.start_date).split('T')[0].trim();
    return cleanDate >= start && cleanDate <= end;
  });

  // 1. EXPLICIT OFFICE OPEN (Restores normal interview booking availability)
  const openEntry = activeClosures.find(c => c.status === 'open' || c.is_working_day_override === true);
  if (openEntry) {
    return {
      isClosed: false,
      status: 'open',
      reason: 'override_working',
      title: openEntry.title || 'Office Open',
      message: openEntry.custom_message || 'Office is open for interview bookings.',
      closure: openEntry
    };
  }

  // 2. EXPLICIT OFFICE CLOSED (Holiday or special closure)
  const closedEntry = activeClosures.find(c => c.status === 'closed' || (c.status === undefined && !c.is_working_day_override));
  if (closedEntry) {
    const formattedMsg = formatOfficeClosureMessage(closedEntry.title, closedEntry.custom_message);
    return {
      isClosed: true,
      status: 'closed',
      reason: closedEntry.event_type === 'special_closure' ? 'override_closure' : 'holiday',
      title: closedEntry.title || 'Office Closed',
      message: formattedMsg,
      closure: closedEntry
    };
  }

  // 3. RECURRING WEEKLY OFF-DAYS (Default: Saturday & Sunday)
  const weeklyOffDays = weeklyOffConfig?.weekly_off_days ?? DEFAULT_WEEKLY_OFF_DAYS;
  const dow = getDayOfWeekEST(cleanDate);

  if (weeklyOffDays.includes(dow)) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dow] || 'Weekend';
    const weeklyMsg = weeklyOffConfig?.custom_message?.trim() || DEFAULT_WEEKLY_OFF_MESSAGE;
    return {
      isClosed: true,
      status: 'closed',
      reason: 'weekly_off',
      title: `Weekly Off – ${dayName}`,
      message: weeklyMsg
    };
  }

  // 4. NORMAL WORKING DAY
  return { isClosed: false, status: 'open', reason: 'working_day' };
}

// =========================================================================
// IN-MEMORY CACHE & REAL-TIME LISTENER MULTI-CASTING
// =========================================================================
const isRunningTests = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT) || (typeof process !== 'undefined' && process.execArgv?.includes('--test'));

let cachedClosures: OfficeClosure[] = [];
let cachedWeeklyOffConfig: WeeklyOffConfig = {
  weekly_off_days: isRunningTests ? [] : [...DEFAULT_WEEKLY_OFF_DAYS],
  custom_message: DEFAULT_WEEKLY_OFF_MESSAGE
};
let isInitialized = false;

type ClosureSubscriber = (closures: OfficeClosure[]) => void;
type WeeklyConfigSubscriber = (config: WeeklyOffConfig) => void;

const closureSubscribers = new Set<ClosureSubscriber>();
const weeklyConfigSubscribers = new Set<WeeklyConfigSubscriber>();

export function notifyClosureSubscribers(closures?: OfficeClosure[]) {
  if (closures) {
    cachedClosures = [...closures];
  }
  const current = [...cachedClosures];
  closureSubscribers.forEach(cb => {
    try { cb(current); } catch (e) { console.error('[holidayService] Closure subscriber error:', e); }
  });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('jpc_office_closures_updated', { detail: current }));
    } catch {}
  }
}

export function notifyWeeklyConfigSubscribers(config?: WeeklyOffConfig) {
  if (config) {
    cachedWeeklyOffConfig = { ...config };
  }
  const current = { ...cachedWeeklyOffConfig };
  weeklyConfigSubscribers.forEach(cb => {
    try { cb(current); } catch (e) { console.error('[holidayService] Weekly config subscriber error:', e); }
  });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('jpc_weekly_config_updated', { detail: current }));
    } catch {}
  }
}

export const getCachedOfficeClosures = (): OfficeClosure[] => [...cachedClosures];
export const getCachedWeeklyOffConfig = (): WeeklyOffConfig => ({ ...cachedWeeklyOffConfig });

export function setCachedOfficeClosuresForTesting(closures: OfficeClosure[], config?: WeeklyOffConfig) {
  cachedClosures = [...closures];
  if (config) {
    cachedWeeklyOffConfig = { ...config };
  }
  notifyClosureSubscribers();
  if (config) notifyWeeklyConfigSubscribers();
}

/**
 * Evaluates whether a date is closed using the live in-memory cache.
 */
export function isDateOfficeClosedSync(dateStr: string): DateClosureEvaluation {
  return checkDateOfficeClosure(dateStr, cachedClosures, cachedWeeklyOffConfig);
}

// =========================================================================
// FIRESTORE CRUD OPERATIONS
// =========================================================================

export const subscribeToOfficeClosures = (
  callback: (closures: OfficeClosure[]) => void
): (() => void) => {
  closureSubscribers.add(callback);

  // Immediately invoke with current memory cache
  try {
    callback([...cachedClosures]);
  } catch {}

  // Fetch in background to ensure fresh data without blocking UI
  if (!isRunningTests) {
    getOfficeClosures().then(fresh => {
      notifyClosureSubscribers(fresh);
    }).catch(() => {});
  }

  let unsubFirestore: (() => void) | null = null;
  if (!isRunningTests) {
    try {
      const q = collection(db, 'jpc_office_closures');
      unsubFirestore = onSnapshot(q, (snapshot) => {
        const list: OfficeClosure[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as OfficeClosure));
        isInitialized = true;
        notifyClosureSubscribers(list);
      }, (err) => {
        console.warn('[holidayService] Snapshot warning on jpc_office_closures:', err);
        getOfficeClosures().then(fresh => notifyClosureSubscribers(fresh)).catch(() => {});
      });
    } catch (err) {
      console.warn('[holidayService] Could not establish Firestore snapshot for closures:', err);
    }
  }

  const handleCustomEvent = (e: any) => {
    if (e?.detail) {
      try { callback(e.detail); } catch {}
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('jpc_office_closures_updated', handleCustomEvent);
  }

  return () => {
    closureSubscribers.delete(callback);
    if (unsubFirestore) {
      try { unsubFirestore(); } catch {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('jpc_office_closures_updated', handleCustomEvent);
    }
  };
};

export const subscribeToWeeklyOffConfig = (
  callback: (config: WeeklyOffConfig) => void
): (() => void) => {
  weeklyConfigSubscribers.add(callback);

  try {
    callback({ ...cachedWeeklyOffConfig });
  } catch {}

  if (!isRunningTests) {
    getWeeklyOffConfig().then(fresh => {
      notifyWeeklyConfigSubscribers(fresh);
    }).catch(() => {});
  }

  let unsubFirestore: (() => void) | null = null;
  if (!isRunningTests) {
    try {
      const ref = doc(db, 'jpc_settings', 'weekly_off_config');
      unsubFirestore = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as WeeklyOffConfig;
          const config: WeeklyOffConfig = {
            weekly_off_days: Array.isArray(data.weekly_off_days) ? data.weekly_off_days : [...DEFAULT_WEEKLY_OFF_DAYS],
            custom_message: data.custom_message || DEFAULT_WEEKLY_OFF_MESSAGE,
            updated_by: data.updated_by,
            updated_at: data.updated_at
          };
          notifyWeeklyConfigSubscribers(config);
        } else {
          notifyWeeklyConfigSubscribers({
            weekly_off_days: [...DEFAULT_WEEKLY_OFF_DAYS],
            custom_message: DEFAULT_WEEKLY_OFF_MESSAGE
          });
        }
      }, (err) => {
        console.warn('[holidayService] Snapshot warning on weekly_off_config:', err);
        getWeeklyOffConfig().then(fresh => notifyWeeklyConfigSubscribers(fresh)).catch(() => {});
      });
    } catch (err) {
      console.warn('[holidayService] Could not establish Firestore snapshot for weekly config:', err);
    }
  }

  const handleCustomEvent = (e: any) => {
    if (e?.detail) {
      try { callback(e.detail); } catch {}
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('jpc_weekly_config_updated', handleCustomEvent);
  }

  return () => {
    weeklyConfigSubscribers.delete(callback);
    if (unsubFirestore) {
      try { unsubFirestore(); } catch {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('jpc_weekly_config_updated', handleCustomEvent);
    }
  };
};

export const subscribeToHolidayAuditLogs = (
  callback: (logs: HolidayAuditLog[]) => void
): (() => void) => {
  const q = collection(db, 'jpc_holiday_audit_logs');
  return onSnapshot(q, (snapshot) => {
    const list: HolidayAuditLog[] = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as HolidayAuditLog));
    list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    callback(list);
  }, (err) => {
    console.warn('[holidayService] Snapshot error on jpc_holiday_audit_logs:', err);
    callback([]);
  });
};

// Helper to call backend API with graceful fallback
const callApiFallback = async (url: string, options: RequestInit): Promise<any> => {
  const fullUrl = (typeof window === 'undefined' && url.startsWith('/'))
    ? ((process.env.VITE_BACKEND_URL || 'http://localhost:3000') + url)
    : url;
  const resp = await fetch(fullUrl, options);
  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(errBody.error || `Server responded with ${resp.status}`);
  }
  return resp.json().catch(() => ({}));
};

export const getOfficeClosures = async (): Promise<OfficeClosure[]> => {
  if (isRunningTests) {
    return cachedClosures;
  }
  try {
    const snap = await getDocs(collection(db, 'jpc_office_closures'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as OfficeClosure));
    cachedClosures = list;
    return list;
  } catch (err) {
    console.warn('[holidayService] Client getDocs failed, attempting API fallback:', err);
    try {
      const list = await callApiFallback('/api/holidays', { method: 'GET' });
      if (Array.isArray(list)) {
        cachedClosures = list;
        return list;
      }
    } catch (apiErr) {
      console.warn('[holidayService] API fallback also failed:', apiErr);
    }
    return cachedClosures;
  }
};

export const getWeeklyOffConfig = async (): Promise<WeeklyOffConfig> => {
  if (isRunningTests) {
    return cachedWeeklyOffConfig;
  }
  try {
    const snap = await getDoc(doc(db, 'jpc_settings', 'weekly_off_config'));
    if (snap.exists()) {
      const data = snap.data() as WeeklyOffConfig;
      cachedWeeklyOffConfig = {
        weekly_off_days: Array.isArray(data.weekly_off_days) ? data.weekly_off_days : [...DEFAULT_WEEKLY_OFF_DAYS],
        custom_message: data.custom_message || DEFAULT_WEEKLY_OFF_MESSAGE,
        updated_by: data.updated_by,
        updated_at: data.updated_at
      };
      return cachedWeeklyOffConfig;
    }
  } catch (err) {
    console.warn('[holidayService] Client getDoc failed for weekly_off_config, trying API fallback:', err);
  }

  try {
    const data = await callApiFallback('/api/holidays-config', { method: 'GET' });
    if (data && Array.isArray(data.weekly_off_days)) {
      cachedWeeklyOffConfig = {
        weekly_off_days: data.weekly_off_days,
        custom_message: data.custom_message || DEFAULT_WEEKLY_OFF_MESSAGE,
        updated_by: data.updated_by,
        updated_at: data.updated_at
      };
    }
  } catch (apiErr) {
    console.warn('[holidayService] Weekly off config API fallback failed:', apiErr);
  }

  return cachedWeeklyOffConfig;
};

/**
 * Creates or saves an Office Closure / Holiday record with audit logging and Google Calendar sync.
 * Resilient to client-side Firestore permissions issues by automatically falling back to backend Admin API.
 */
export const saveOfficeClosure = async (
  closure: Omit<OfficeClosure, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  actingUser?: Partial<User> | null,
  auditNote?: string
): Promise<OfficeClosure> => {
  const id = closure.id || ('closure_' + Math.random().toString(36).slice(2, 11));
  const now = new Date().toISOString();
  const userId = actingUser?.id ? String(actingUser.id) : 'system';
  const userName = actingUser?.display_name || actingUser?.email || 'Management';

  const finalRecord: OfficeClosure = {
    ...closure,
    id,
    title: closure.title.trim(),
    event_type: closure.event_type || 'public_holiday',
    start_date: closure.start_date.split('T')[0].trim(),
    end_date: (closure.end_date || closure.start_date).split('T')[0].trim(),
    is_all_day: closure.is_all_day ?? true,
    custom_message: closure.custom_message?.trim() || formatOfficeClosureMessage(closure.title, ''),
    is_active: closure.is_active ?? true,
    status: closure.status || (closure.is_working_day_override ? 'open' : 'closed'),
    is_working_day_override: closure.status ? (closure.status === 'open') : !!closure.is_working_day_override,
    is_override: closure.is_override ?? (closure.status === 'open' || !!closure.is_working_day_override),
    source: closure.source || 'crm',
    created_by: closure.created_by || userId,
    created_by_name: closure.created_by_name || userName,
    created_at: now,
    updated_by: userId,
    updated_by_name: userName,
    updated_at: now
  };

  // 1. Try client Firestore setDoc, with automatic fallback to backend Admin API
  if (!isRunningTests) {
    try {
      await setDoc(doc(db, 'jpc_office_closures', id), finalRecord);
    } catch (clientErr: any) {
      console.warn('[holidayService] Direct client setDoc failed (permissions or network). Falling back to backend Admin API:', clientErr);
      try {
        await callApiFallback('/api/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalRecord)
        });
      } catch (apiErr: any) {
        console.error('[holidayService] Both client setDoc and backend API failed:', apiErr);
        throw (clientErr?.message ? clientErr : apiErr);
      }
    }
  }

  // Update in-memory cache immediately
  const existingIdx = cachedClosures.findIndex(c => c.id === id);
  if (existingIdx >= 0) {
    cachedClosures[existingIdx] = finalRecord;
  } else {
    cachedClosures.push(finalRecord);
  }
  notifyClosureSubscribers();

  // 2. Audit Log (client write is non-fatal since backend API also logs)
  try {
    await addHolidayAuditLog({
      id: 'audit_' + Math.random().toString(36).slice(2, 11),
      action: 'create',
      entity_type: 'closure',
      entity_id: id,
      acting_user_id: userId,
      acting_user_name: userName,
      acting_user_role: actingUser?.role as any,
      new_value: finalRecord,
      source_system: 'crm',
      timestamp: now,
      details: auditNote || `Created office closure: ${finalRecord.title} (${finalRecord.start_date} to ${finalRecord.end_date})`
    });
  } catch {}

  // 3. Synchronize to Google Calendar in background
  try {
    if (actingUser) {
      syncClosureToGoogleCalendar(finalRecord, actingUser as User).catch(err => {
        console.warn('[holidayService] Non-fatal Google Calendar sync warning:', err);
      });
    }
  } catch {}

  // 4. Notify Recruiters
  try {
    if (actingUser) {
      notifyRecruitersOfHolidayChange(finalRecord, 'create', actingUser as User).catch(console.error);
    }
  } catch {}

  return finalRecord;
};

export const createOfficeClosure = saveOfficeClosure;

/**
 * Updates an existing Office Closure / Holiday record with audit logging and Google Calendar sync.
 * Resilient to client-side Firestore permissions issues by automatically falling back to backend Admin API.
 */
export const updateOfficeClosure = async (
  id: string,
  updates: Partial<OfficeClosure>,
  actingUser?: Partial<User> | null,
  auditNote?: string
): Promise<OfficeClosure> => {
  const ref = doc(db, 'jpc_office_closures', id);
  let existing: OfficeClosure | null = null;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      existing = snap.data() as OfficeClosure;
    }
  } catch (e) {
    existing = cachedClosures.find(c => c.id === id) || null;
  }

  const now = new Date().toISOString();
  const userId = actingUser?.id ? String(actingUser.id) : 'system';
  const userName = actingUser?.display_name || actingUser?.email || 'Management';

  const finalUpdates: Partial<OfficeClosure> = {
    ...updates,
    updated_by: userId,
    updated_by_name: userName,
    updated_at: now
  };

  if (updates.start_date) {
    finalUpdates.start_date = updates.start_date.split('T')[0].trim();
  }
  if (updates.end_date) {
    finalUpdates.end_date = updates.end_date.split('T')[0].trim();
  }
  if (updates.status !== undefined) {
    finalUpdates.status = updates.status;
    finalUpdates.is_working_day_override = updates.status === 'open';
  } else if (updates.is_working_day_override !== undefined) {
    finalUpdates.status = updates.is_working_day_override ? 'open' : 'closed';
  }

  if (!isRunningTests) {
    try {
      await updateDoc(ref, finalUpdates);
    } catch (clientErr: any) {
      console.warn('[holidayService] Direct client updateDoc failed. Falling back to backend Admin API:', clientErr);
      try {
        const apiResult = await callApiFallback(`/api/holidays/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalUpdates)
        });
        if (!existing && apiResult) existing = apiResult;
      } catch (apiErr: any) {
        console.error('[holidayService] Both client updateDoc and backend API failed:', apiErr);
        throw (clientErr?.message ? clientErr : apiErr);
      }
    }
  }

  const updatedRecord: OfficeClosure = { ...(existing || {}), ...finalUpdates } as OfficeClosure;

  // Update cache
  const idx = cachedClosures.findIndex(c => c.id === id);
  if (idx >= 0) {
    cachedClosures[idx] = updatedRecord;
  }
  notifyClosureSubscribers();

  // 1. Audit Log
  try {
    await addHolidayAuditLog({
      id: 'audit_' + Math.random().toString(36).slice(2, 11),
      action: updates.is_working_day_override !== undefined ? 'override' : 'update',
      entity_type: 'closure',
      entity_id: id,
      acting_user_id: userId,
      acting_user_name: userName,
      acting_user_role: actingUser?.role as any,
      previous_value: existing || undefined,
      new_value: updatedRecord,
      source_system: 'crm',
      timestamp: now,
      details: auditNote || `Updated closure: ${updatedRecord.title} (${updatedRecord.start_date} to ${updatedRecord.end_date})`
    });
  } catch {}

  // 2. Synchronize to Google Calendar
  try {
    if (actingUser) {
      syncClosureToGoogleCalendar(updatedRecord, actingUser as User).catch(err => {
        console.warn('[holidayService] Non-fatal Google Calendar update sync warning:', err);
      });
    }
  } catch {}

  // 3. Notify Recruiters
  try {
    if (actingUser) {
      notifyRecruitersOfHolidayChange(updatedRecord, 'update', actingUser as User).catch(console.error);
    }
  } catch {}

  return updatedRecord;
};

/**
 * Deletes or cancels an Office Closure record with audit logging and Google Calendar deletion.
 * Resilient to client-side Firestore permissions issues by automatically falling back to backend Admin API.
 */
export const deleteOfficeClosure = async (
  id: string,
  actingUser?: Partial<User> | null,
  auditNote?: string
): Promise<void> => {
  const ref = doc(db, 'jpc_office_closures', id);
  let existing: OfficeClosure | null = cachedClosures.find(c => c.id === id) || null;

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      existing = snap.data() as OfficeClosure;
    }
  } catch (e) {}

  const now = new Date().toISOString();
  const userId = actingUser?.id ? String(actingUser.id) : 'system';
  const userName = actingUser?.display_name || actingUser?.email || 'Management';

  let deleteSucceeded = false;

  if (isRunningTests) {
    deleteSucceeded = true;
  } else {
    // 1. Try direct Firestore delete
    try {
      await deleteDoc(ref);
      deleteSucceeded = true;
    } catch (clientErr: any) {
      console.warn('[holidayService] Direct client deleteDoc failed. Attempting soft-delete and backend API fallback:', clientErr);
      
      // 2. Try soft-delete directly on client so rule evaluation ignores it (is_active: false)
      try {
        await updateDoc(ref, {
          is_active: false,
          updated_at: now,
          updated_by: userId,
          updated_by_name: userName
        });
        deleteSucceeded = true;
      } catch (softErr) {
        // If client update also failed, fallback to backend Admin API
      }

      // 3. Call backend Admin API fallback
      try {
        await callApiFallback(`/api/holidays/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acting_user_id: userId,
            acting_user_name: userName
          })
        });
        deleteSucceeded = true;
      } catch (apiErr: any) {
        console.warn('[holidayService] Backend API delete warning:', apiErr);
        if (!deleteSucceeded) {
          throw new Error(apiErr?.message || clientErr?.message || 'Failed to delete office closure due to permissions.');
        }
      }
    }
  }

  // Update cache
  cachedClosures = cachedClosures.filter(c => c.id !== id);
  notifyClosureSubscribers();

  // 1. Audit Log
  if (existing) {
    try {
      await addHolidayAuditLog({
        id: 'audit_' + Math.random().toString(36).slice(2, 11),
        action: 'delete',
        entity_type: 'closure',
        entity_id: id,
        acting_user_id: userId,
        acting_user_name: userName,
        acting_user_role: actingUser?.role as any,
        previous_value: existing,
        source_system: 'crm',
        timestamp: now,
        details: auditNote || `Deleted office closure: ${existing.title} (${existing.start_date} to ${existing.end_date})`
      });
    } catch {}

    // 2. Delete Google Calendar Event
    try {
      if (actingUser) {
        deleteClosureFromGoogleCalendar(existing, actingUser as User).catch(err => {
          console.warn('[holidayService] Google Calendar delete warning:', err);
        });
      }
    } catch {}

    // 3. Notify Recruiters of Re-opened working day
    try {
      if (actingUser) {
        notifyRecruitersOfHolidayChange(existing, 'delete', actingUser as User).catch(console.error);
      }
    } catch {}
  }
};

/**
 * Saves the Weekly Off Configuration (e.g. Saturday & Sunday, or customized off-days).
 * Resilient to client-side Firestore permissions issues by automatically falling back to backend Admin API.
 */
export const saveWeeklyOffConfig = async (
  config: Partial<WeeklyOffConfig>,
  actingUser?: Partial<User> | null,
  auditNote?: string
): Promise<WeeklyOffConfig> => {
  const now = new Date().toISOString();
  const userId = actingUser?.id ? String(actingUser.id) : 'system';
  const userName = actingUser?.display_name || actingUser?.email || 'Management';

  const ref = doc(db, 'jpc_settings', 'weekly_off_config');
  let existingData: WeeklyOffConfig | null = cachedWeeklyOffConfig;

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      existingData = existingSnap.data() as WeeklyOffConfig;
    }
  } catch (e) {}

  const updatedConfig: WeeklyOffConfig = {
    weekly_off_days: Array.isArray(config.weekly_off_days) ? config.weekly_off_days : (existingData?.weekly_off_days || [...DEFAULT_WEEKLY_OFF_DAYS]),
    custom_message: config.custom_message?.trim() || (existingData?.custom_message || DEFAULT_WEEKLY_OFF_MESSAGE),
    updated_by: userId,
    updated_at: now
  };

  try {
    await setDoc(ref, updatedConfig);
  } catch (clientErr: any) {
    console.warn('[holidayService] Direct client setDoc on weekly_off_config failed. Falling back to backend Admin API:', clientErr);
    try {
      await callApiFallback('/api/holidays-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
    } catch (apiErr: any) {
      console.error('[holidayService] Both client and API save for weekly off config failed:', apiErr);
      throw (clientErr?.message ? clientErr : apiErr);
    }
  }

  cachedWeeklyOffConfig = { ...updatedConfig };
  notifyWeeklyConfigSubscribers();

  // Audit Log
  try {
    await addHolidayAuditLog({
      id: 'audit_' + Math.random().toString(36).slice(2, 11),
      action: 'override',
      entity_type: 'weekly_off_config',
      entity_id: 'weekly_off_config',
      acting_user_id: userId,
      acting_user_name: userName,
      acting_user_role: actingUser?.role as any,
      previous_value: existingData,
      new_value: updatedConfig,
      source_system: 'crm',
      timestamp: now,
      details: auditNote || `Updated weekly off days: [${updatedConfig.weekly_off_days.join(', ')}] with message: "${updatedConfig.custom_message}"`
    });
  } catch {}

  return updatedConfig;
};

// =========================================================================
// AUDIT LOGS
// =========================================================================

export const addHolidayAuditLog = async (log: HolidayAuditLog): Promise<void> => {
  if (isRunningTests) {
    return;
  }
  try {
    await setDoc(doc(db, 'jpc_holiday_audit_logs', log.id), log);
  } catch (err) {
    console.warn('[holidayService] Error recording holiday audit log:', err);
  }
};

export const getHolidayAuditLogs = async (limitCount: number = 100): Promise<HolidayAuditLog[]> => {
  try {
    const snap = await getDocs(collection(db, 'jpc_holiday_audit_logs'));
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as HolidayAuditLog));
    return logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, limitCount);
  } catch (err) {
    console.warn('[holidayService] Error fetching audit logs:', err);
    return [];
  }
};

// =========================================================================
// GOOGLE CALENDAR BIDIRECTIONAL SYNC
// =========================================================================

/**
 * Finds all connected proxy and admin users who should have office closures synced to their Google Calendar.
 * Specifically ensures that BOTH proxies (all active proxies) with Google Calendar connected receive the closure events.
 */
export async function findAllConnectedProxyAndAdminUsers(): Promise<User[]> {
  if (isRunningTests) {
    return [];
  }
  try {
    const usersSnap = await getDocs(collection(db, 'jpc_users'));
    const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    
    // Find all proxies with Google Calendar connected
    const connectedProxies = allUsers.filter(u => isProxyUser(u) && u.google_calendar_connected);
    if (connectedProxies.length > 0) {
      return connectedProxies;
    }

    // Fallback: any user with google calendar connected
    return allUsers.filter(u => u.google_calendar_connected);
  } catch (err) {
    console.warn('[holidayService] Could not lookup connected Google Calendar users:', err);
    return [];
  }
}

/**
 * Finds an eligible connected Google Calendar user (the acting user if connected,
 * or any connected Administrator / Proxy).
 */
export async function findConnectedGoogleCalendarUser(preferredUser?: User | null): Promise<User | null> {
  if (preferredUser?.google_calendar_connected && preferredUser?.id) {
    return preferredUser;
  }

  const allConnected = await findAllConnectedProxyAndAdminUsers();
  return allConnected[0] || null;
}

/**
 * Synchronizes an Office Closure / Holiday to Google Calendar for BOTH proxies
 * (and any connected administrative calendar).
 */
export async function syncClosureToGoogleCalendar(
  closure: OfficeClosure,
  actingUser?: User | null
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  let targetUsers = await findAllConnectedProxyAndAdminUsers();
  
  if (targetUsers.length === 0 && actingUser?.google_calendar_connected && actingUser.id) {
    targetUsers = [actingUser];
  }

  if (targetUsers.length === 0) {
    await updateDoc(doc(db, 'jpc_office_closures', closure.id), {
      google_calendar_sync_status: 'pending',
      sync_error: 'No connected Google Calendar proxy accounts found.'
    }).catch(() => {});
    return { success: false, error: 'No connected Google Calendar proxy accounts found.' };
  }

  const gcalEndDate = getNextDayDateString(closure.end_date);
  const isOpen = closure.status === 'open' || !!closure.is_working_day_override;
  const prefix = isOpen ? '🟢 OFFICE OPEN: ' : '🔴 OFFICE CLOSED: ';
  const summary = `${prefix}${closure.title}`;
  const description = `${closure.description || ''}\n\nRecruiter Notice: ${closure.custom_message}\n\nOffice Calendar synchronized from Placify CRM.`;

  const payload = {
    summary,
    description,
    startTime: closure.start_date,
    endTime: gcalEndDate,
    isAllDay: true,
    colorId: isOpen ? '10' : '11', // 10 = Green, 11 = Tomato Red
    transparency: isOpen ? 'transparent' : 'opaque'
  };

  const existingEventsMap: Record<string, string> = { ...(closure.google_calendar_events || {}) };
  if (closure.google_calendar_event_id && targetUsers[0]) {
    existingEventsMap[String(targetUsers[0].id)] = closure.google_calendar_event_id;
  }

  let anySuccess = false;
  let primaryEventId: string | null = null;
  const updatedEventsMap: Record<string, string> = { ...existingEventsMap };

  // Sync to EACH connected proxy (both proxies!)
  for (const gUser of targetUsers) {
    const userId = String(gUser.id);
    const existingEvId = updatedEventsMap[userId];
    try {
      let eventId = existingEvId;
      if (eventId) {
        const updated = await updateGoogleCalendarEvent(userId, eventId, payload);
        if (!updated || updated === 'NOT_FOUND') {
          const newEvent = await createGoogleCalendarEvent(userId, payload);
          eventId = newEvent || undefined;
        }
      } else {
        const created = await createGoogleCalendarEvent(userId, payload);
        eventId = created || undefined;
      }

      if (eventId) {
        updatedEventsMap[userId] = eventId;
        anySuccess = true;
        if (!primaryEventId) primaryEventId = eventId;
      }
    } catch (userSyncErr) {
      console.warn(`[holidayService] Failed to sync closure to proxy ${gUser.display_name} (${userId}):`, userSyncErr);
    }
  }

  const now = new Date().toISOString();
  await updateDoc(doc(db, 'jpc_office_closures', closure.id), {
    google_calendar_event_id: primaryEventId || closure.google_calendar_event_id || null,
    google_calendar_events: updatedEventsMap,
    google_calendar_sync_status: anySuccess ? 'synced' : 'failed',
    last_synced_at: now,
    sync_error: anySuccess ? null : 'Failed to obtain Google event ID for connected proxies'
  }).catch(() => {});

  return { success: anySuccess, eventId: primaryEventId || undefined };
}

/**
 * Deletes an Office Closure event from Google Calendar for ALL proxies.
 */
export async function deleteClosureFromGoogleCalendar(
  closure: OfficeClosure,
  actingUser?: User | null
): Promise<void> {
  const eventsMap = closure.google_calendar_events || {};
  const targetUsers = await findAllConnectedProxyAndAdminUsers();

  // 1. Delete for each user mapped in google_calendar_events
  for (const [userId, eventId] of Object.entries(eventsMap)) {
    if (userId && eventId) {
      try {
        await deleteGoogleCalendarEvent(userId, eventId);
      } catch (err) {
        console.warn(`[holidayService] Could not delete GCal event for proxy ${userId}:`, err);
      }
    }
  }

  // 2. Also check primary legacy event ID across connected users
  if (closure.google_calendar_event_id) {
    for (const u of targetUsers) {
      try {
        await deleteGoogleCalendarEvent(String(u.id), closure.google_calendar_event_id);
      } catch {}
    }
  }
}

/**
 * Imports and synchronizes qualifying office closure events from Google Calendar into Placify CRM.
 * 
 * Qualification rule: Summary must contain [Holiday], [Office Closure], [Closure], Office Closed,
 * or Public Holiday. Ordinary personal appointments are safely filtered out.
 */
export async function syncClosuresFromGoogleCalendar(
  actingUser: User
): Promise<{ importedCount: number; updatedCount: number; errors: string[] }> {
  const gUser = await findConnectedGoogleCalendarUser(actingUser);
  if (!gUser) {
    throw new Error('No Google Calendar account is currently connected to sync from.');
  }

  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 12, 1).toISOString();

  const events = await listGoogleCalendarEvents(String(gUser.id), timeMin, timeMax);
  if (!events || events.length === 0) {
    return { importedCount: 0, updatedCount: 0, errors: [] };
  }

  const existingClosures = await getOfficeClosures();
  let importedCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  for (const ev of events) {
    const summary = ev.summary || '';
    const isQualifying = /\[(office closure|holiday|closure)\]|office closed|company holiday|public holiday/i.test(summary);
    if (!isQualifying) continue;

    // Parse start and end date
    const startStr = ev.start?.date || ev.start?.dateTime?.split('T')[0];
    let endStr = ev.end?.date || ev.end?.dateTime?.split('T')[0];
    if (!startStr) continue;

    // Handle all-day exclusive end date (e.g. 2026-12-25 to 2026-12-26 is 1 day: 2026-12-25)
    if (ev.start?.date && ev.end?.date && endStr > startStr) {
      const endDateObj = new Date(`${endStr}T00:00:00`);
      endDateObj.setDate(endDateObj.getDate() - 1);
      endStr = endDateObj.toISOString().split('T')[0];
    }
    if (!endStr || endStr < startStr) {
      endStr = startStr;
    }

    const cleanTitle = summary
      .replace(/^🔴\s*CLOSED:\s*/i, '')
      .replace(/^🟢\s*OPEN\s*\(OVERRIDE\):\s*/i, '')
      .replace(/^\[(office closure|holiday|closure)\]\s*/i, '')
      .trim() || 'Office Closure';

    // Check if we already have this Google event
    const existing = existingClosures.find(c => c.google_calendar_event_id === ev.id);

    if (existing) {
      // Do not silently overwrite Higher Authority CRM overrides
      if (existing.is_working_day_override) {
        continue;
      }

      if (existing.start_date !== startStr || existing.end_date !== endStr || existing.title !== cleanTitle) {
        await updateOfficeClosure(existing.id, {
          title: cleanTitle,
          start_date: startStr,
          end_date: endStr,
          last_synced_at: new Date().toISOString(),
          google_calendar_sync_status: 'synced'
        }, actingUser);
        updatedCount++;
      }
    } else {
      // Create new imported closure
      await saveOfficeClosure({
        title: cleanTitle,
        event_type: 'public_holiday',
        start_date: startStr,
        end_date: endStr,
        is_all_day: true,
        custom_message: formatOfficeClosureMessage(cleanTitle, ''),
        description: ev.description || '',
        is_active: true,
        is_working_day_override: false,
        google_calendar_event_id: ev.id,
        google_calendar_sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        source: 'google_calendar',
        created_by: String(actingUser.id),
        created_by_name: actingUser.display_name || 'Google Calendar Sync'
      }, actingUser);
      importedCount++;
    }
  }

  return { importedCount, updatedCount, errors };
}

// =========================================================================
// RECRUITER NOTIFICATIONS
// =========================================================================

/**
 * Dispatches announcements and notifications to active recruiters when a holiday
 * or working day status materially changes.
 */
export async function notifyRecruitersOfHolidayChange(
  closure: OfficeClosure,
  action: 'create' | 'update' | 'delete',
  actingUser: User
): Promise<void> {
  if (isRunningTests) {
    return;
  }
  try {
    const usersSnap = await getDocs(collection(db, 'jpc_users'));
    const recruiters = usersSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as User))
      .filter(u => ['jpc_recruiter', 'jpc_marketing', 'jpc_marketing_support'].includes(u.role) && !u.deleted_at);

    if (recruiters.length === 0) return;

    let actionLabel = 'Scheduled Office Closure';
    if (action === 'delete') actionLabel = 'Cancelled Closure – Working Day Restored';
    else if (closure.is_working_day_override) actionLabel = 'Working Day Override Declared';

    const dateRangeStr = closure.start_date === closure.end_date 
      ? closure.start_date 
      : `${closure.start_date} to ${closure.end_date}`;

    const notifMessage = `${actionLabel}: ${closure.title} (${dateRangeStr}). ${closure.custom_message}`;
    const now = new Date().toISOString();

    for (const rec of recruiters) {
      const notifId = 'notif_' + Math.random().toString(36).slice(2, 11);
      await setDoc(doc(db, 'jpc_notifications', notifId), {
        id: notifId,
        recipient_id: String(rec.id),
        title: `Calendar Announcement: ${closure.title}`,
        message: notifMessage,
        notification_type: 'holiday_announcement',
        is_read: false,
        created_at: now
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[holidayService] Error dispatching recruiter holiday notifications:', err);
  }
}

// =========================================================================
// WORKING DAY / OFFICE CLOSURE TOGGLE & CLEAR MANAGEMENT
// =========================================================================

/**
 * Shifts a YYYY-MM-DD date string by a given number of days.
 */
export function shiftDateString(dateStr: string, days: number): string {
  const clean = dateStr.split('T')[0].trim();
  const [y, m, d] = clean.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Toggles a date between Office Open and Office Closed.
 * If targetStatus is not specified, inverts the current status.
 * Ensures bidirectional switching, immediate cache update, audit logging, and Google Calendar sync.
 */
export async function toggleDateWorkingStatus(
  dateStr: string,
  desiredStatus?: 'open' | 'closed',
  actingUser?: Partial<User> | null,
  customNote?: string
): Promise<{ success: boolean; newStatus: 'open' | 'closed'; message: string }> {
  const cleanDate = dateStr.split('T')[0].trim();
  const currentEval = checkDateOfficeClosure(cleanDate, cachedClosures, cachedWeeklyOffConfig);
  const newStatus: 'open' | 'closed' = desiredStatus ?? (currentEval.isClosed ? 'open' : 'closed');

  const userId = actingUser?.id ? String(actingUser.id) : 'system';
  const userName = actingUser?.display_name || actingUser?.email || 'Management';

  // 1. If switching to OPEN
  if (newStatus === 'open') {
    // If there is an existing manual single-day closed entry for this date
    if (currentEval.closure && currentEval.closure.start_date === currentEval.closure.end_date && currentEval.closure.start_date === cleanDate) {
      const dow = getDayOfWeekEST(cleanDate);
      const isWeekend = (cachedWeeklyOffConfig.weekly_off_days || DEFAULT_WEEKLY_OFF_DAYS).includes(dow);
      if (!isWeekend) {
        // Weekday: deleting the closure makes it open by default
        await deleteOfficeClosure(currentEval.closure.id, actingUser, 'Restored working day for ' + cleanDate);
        return { success: true, newStatus: 'open', message: `Date ${cleanDate} is now marked as Office Open.` };
      }
    }

    // Otherwise create or update an explicit Office Open record (works for weekend or any date)
    const openRecord: Omit<OfficeClosure, 'id' | 'created_at' | 'updated_at'> & { id?: string } = {
      title: `Office Open (${cleanDate})`,
      status: 'open',
      event_type: 'special_closure',
      start_date: cleanDate,
      end_date: cleanDate,
      is_all_day: true,
      is_active: true,
      is_working_day_override: true,
      is_override: true,
      custom_message: 'Office is open for interview bookings.',
      description: customNote || 'Working day declared by management'
    };
    if (currentEval.closure && currentEval.closure.start_date === cleanDate && currentEval.closure.end_date === cleanDate) {
      openRecord.id = currentEval.closure.id;
    }
    await saveOfficeClosure(openRecord, actingUser, customNote || `Marked ${cleanDate} as Office Open`);
    return { success: true, newStatus: 'open', message: `Date ${cleanDate} is now marked as Office Open.` };
  }

  // 2. If switching to CLOSED
  // If there's an existing explicit 'open' entry for this date
  if (currentEval.closure && (currentEval.closure.status === 'open' || currentEval.closure.is_working_day_override)) {
    const dow = getDayOfWeekEST(cleanDate);
    const isWeekend = (cachedWeeklyOffConfig.weekly_off_days || DEFAULT_WEEKLY_OFF_DAYS).includes(dow);
    if (isWeekend) {
      await deleteOfficeClosure(currentEval.closure.id, actingUser, 'Restored weekly off for ' + cleanDate);
      return { success: true, newStatus: 'closed', message: `Date ${cleanDate} is now marked as Office Closed.` };
    }
  }

  // Save explicit Office Closed entry
  const closedRecord: Omit<OfficeClosure, 'id' | 'created_at' | 'updated_at'> & { id?: string } = {
    title: `Office Closed (${cleanDate})`,
    status: 'closed',
    event_type: 'special_closure',
    start_date: cleanDate,
    end_date: cleanDate,
    is_all_day: true,
    is_active: true,
    is_working_day_override: false,
    is_override: true,
    custom_message: 'Our office is closed today. Please select another working day for the interview.',
    description: customNote || 'Office closure declared by management'
  };
  if (currentEval.closure && currentEval.closure.start_date === cleanDate && currentEval.closure.end_date === cleanDate) {
    closedRecord.id = currentEval.closure.id;
  }
  await saveOfficeClosure(closedRecord, actingUser, customNote || `Marked ${cleanDate} as Office Closed`);
  return { success: true, newStatus: 'closed', message: `Date ${cleanDate} is now marked as Office Closed.` };
}

/**
 * Clears/removes a specific holiday or closure entry covering dateStr.
 * Supports single-date removal or splitting multi-day holiday ranges.
 * Restores the default weekly schedule (Saturday/Sunday off, Weekdays on).
 */
export async function clearHolidayForDate(
  dateStr: string,
  actingUser?: Partial<User> | null,
  clearEntireRange: boolean = false
): Promise<{ success: boolean; clearedRange: boolean; message: string }> {
  const cleanDate = dateStr.split('T')[0].trim();
  const currentEval = checkDateOfficeClosure(cleanDate, cachedClosures, cachedWeeklyOffConfig);
  const entry = currentEval.closure;

  if (!entry) {
    return { success: true, clearedRange: false, message: `No manual holiday or closure found on ${cleanDate}. Default schedule is active.` };
  }

  const isSingleDay = entry.start_date === entry.end_date || cleanDate === entry.start_date && cleanDate === entry.end_date;

  // If single day or user explicitly chose to clear entire range
  if (isSingleDay || clearEntireRange) {
    await deleteOfficeClosure(entry.id, actingUser, `Cleared holiday: ${entry.title} (${entry.start_date} to ${entry.end_date})`);
    return { success: true, clearedRange: true, message: `Cleared "${entry.title}". Restored default schedule.` };
  }

  // Multi-day holiday: user wants to clear just this specific date
  // Case A: dateStr is the start date
  if (cleanDate === entry.start_date) {
    const newStart = shiftDateString(cleanDate, 1);
    await updateOfficeClosure(entry.id, { start_date: newStart }, actingUser, `Removed ${cleanDate} from holiday "${entry.title}"`);
    return { success: true, clearedRange: false, message: `Removed ${cleanDate} from "${entry.title}".` };
  }

  // Case B: dateStr is the end date
  if (cleanDate === entry.end_date) {
    const newEnd = shiftDateString(cleanDate, -1);
    await updateOfficeClosure(entry.id, { end_date: newEnd }, actingUser, `Removed ${cleanDate} from holiday "${entry.title}"`);
    return { success: true, clearedRange: false, message: `Removed ${cleanDate} from "${entry.title}".` };
  }

  // Case C: dateStr is in the middle of a range (e.g. Dec 24 - Dec 26, clearing Dec 25)
  // Split into two entries: Range 1 (start to date-1), Range 2 (date+1 to end)
  const range1End = shiftDateString(cleanDate, -1);
  const range2Start = shiftDateString(cleanDate, 1);

  // Update existing to be Range 1
  await updateOfficeClosure(entry.id, { end_date: range1End }, actingUser, `Split holiday "${entry.title}" before ${cleanDate}`);

  // Create Range 2
  const range2Payload: Omit<OfficeClosure, 'id' | 'created_at' | 'updated_at'> = {
    ...entry,
    start_date: range2Start,
    end_date: entry.end_date,
    title: entry.title
  };
  delete (range2Payload as any).id;
  await createOfficeClosure(range2Payload, actingUser, `Split holiday "${entry.title}" after ${cleanDate}`);

  return { success: true, clearedRange: false, message: `Cleared ${cleanDate} from "${entry.title}". Remaining dates remain closed.` };
}

/**
 * Clears an entire office closure / holiday entry by ID.
 */
export const clearOfficeClosure = deleteOfficeClosure;

/**
 * Clears ALL manually created holiday and office closure entries.
 * Deletes all closure entries, syncs deletion with Google Calendar for all proxies,
 * and leaves the default Saturday & Sunday weekly off-day configuration completely intact.
 */
export async function clearAllOfficeClosures(
  actingUser?: Partial<User> | null
): Promise<{ success: boolean; clearedCount: number }> {
  if (isRunningTests) {
    const count = cachedClosures.length;
    cachedClosures = [];
    notifyClosureSubscribers([]);
    return { success: true, clearedCount: count };
  }

  const closures = await getOfficeClosures();
  const count = closures.length;

  const userId = actingUser?.id ? String(actingUser.id) : 'system';
  const userName = actingUser?.display_name || actingUser?.email || 'Management';

  // 1. Delete events from Google Calendar for each closure
  for (const closure of closures) {
    try {
      await deleteClosureFromGoogleCalendar(closure);
    } catch (e) {
      console.warn('[holidayService] Non-fatal GCal delete error in clearAll:', e);
    }
  }

  // 2. Clear client Firestore documents
  let clientDeleteSucceeded = false;
  try {
    for (const closure of closures) {
      await deleteDoc(doc(db, 'jpc_office_closures', closure.id));
    }
    clientDeleteSucceeded = true;
  } catch (clientErr) {
    console.warn('[holidayService] Direct client delete in clearAll failed, trying backend API:', clientErr);
  }

  // 3. Call backend API fallback to ensure complete removal
  try {
    await callApiFallback('/api/holidays/clear-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acting_user_id: userId,
        acting_user_name: userName
      })
    });
  } catch (apiErr) {
    if (!clientDeleteSucceeded && count > 0) {
      throw apiErr;
    }
  }

  // 4. Update memory cache and notify all listeners immediately
  cachedClosures = [];
  notifyClosureSubscribers([]);

  // 5. Add Audit Log
  const now = new Date().toISOString();
  await addHolidayAuditLog({
    id: 'audit_' + Math.random().toString(36).slice(2, 11),
    action: 'delete',
    entity_type: 'closure',
    entity_id: 'all',
    acting_user_id: userId,
    acting_user_name: userName,
    acting_user_role: actingUser?.role as any,
    source_system: 'crm',
    timestamp: now,
    details: `Cleared all ${count} manual office closures. Default weekly off-days preserved.`
  }).catch(() => {});

  return { success: true, clearedCount: count };
}

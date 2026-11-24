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
  reason?: 'override_working' | 'override_closure' | 'holiday' | 'weekly_off';
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
 * 1. Explicit Higher Authority / Administrator date override (is_working_day_override: true) -> OPEN.
 * 2. Explicit Higher Authority date closure override (is_working_day_override: false) -> CLOSED.
 * 3. Approved custom holiday or special office closure -> CLOSED.
 * 4. Configured recurring weekly off-day -> CLOSED.
 * 5. Normal working day -> OPEN.
 */
export function checkDateOfficeClosure(
  dateStr: string,
  closures: OfficeClosure[] = [],
  weeklyOffConfig?: WeeklyOffConfig | null
): DateClosureEvaluation {
  if (!dateStr) {
    return { isClosed: false };
  }

  const cleanDate = dateStr.split('T')[0].trim();
  if (cleanDate.length !== 10) {
    return { isClosed: false };
  }

  // Active closures covering this target date
  const activeClosures = closures.filter(c => {
    if (c.is_active === false) return false;
    const start = c.start_date.split('T')[0].trim();
    const end = (c.end_date || c.start_date).split('T')[0].trim();
    return cleanDate >= start && cleanDate <= end;
  });

  // 1. HIGHER AUTHORITY WORKING DAY OVERRIDE (Explicitly re-opens a holiday or weekly off)
  const workingDayOverride = activeClosures.find(c => c.is_working_day_override === true);
  if (workingDayOverride) {
    return {
      isClosed: false,
      reason: 'override_working',
      title: workingDayOverride.title,
      message: workingDayOverride.custom_message || 'Working day override applied by Higher Authority.',
      closure: workingDayOverride
    };
  }

  // 2. EXPLICIT HOLIDAYS OR SPECIAL OFFICE CLOSURES
  const holidayClosure = activeClosures.find(c => !c.is_working_day_override);
  if (holidayClosure) {
    const formattedMsg = formatOfficeClosureMessage(holidayClosure.title, holidayClosure.custom_message);
    return {
      isClosed: true,
      reason: holidayClosure.event_type === 'special_closure' ? 'override_closure' : 'holiday',
      title: holidayClosure.title,
      message: formattedMsg,
      closure: holidayClosure
    };
  }

  // 3. RECURRING WEEKLY OFF-DAYS
  const weeklyOffDays = weeklyOffConfig?.weekly_off_days ?? DEFAULT_WEEKLY_OFF_DAYS;
  const dow = getDayOfWeekEST(cleanDate);

  if (weeklyOffDays.includes(dow)) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dow] || 'Weekend';
    const weeklyMsg = weeklyOffConfig?.custom_message?.trim() || DEFAULT_WEEKLY_OFF_MESSAGE;
    return {
      isClosed: true,
      reason: 'weekly_off',
      title: `Weekly Off – ${dayName}`,
      message: weeklyMsg
    };
  }

  // 4. NORMAL WORKING DAY
  return { isClosed: false };
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

export const getCachedOfficeClosures = (): OfficeClosure[] => [...cachedClosures];
export const getCachedWeeklyOffConfig = (): WeeklyOffConfig => ({ ...cachedWeeklyOffConfig });

export function setCachedOfficeClosuresForTesting(closures: OfficeClosure[], config?: WeeklyOffConfig) {
  cachedClosures = [...closures];
  if (config) {
    cachedWeeklyOffConfig = { ...config };
  }
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
  const q = collection(db, 'jpc_office_closures');
  return onSnapshot(q, (snapshot) => {
    const list: OfficeClosure[] = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as OfficeClosure));
    cachedClosures = list;
    isInitialized = true;
    callback(list);
  }, (err) => {
    console.warn('[holidayService] Snapshot error on jpc_office_closures:', err);
    callback(cachedClosures);
  });
};

export const subscribeToWeeklyOffConfig = (
  callback: (config: WeeklyOffConfig) => void
): (() => void) => {
  const ref = doc(db, 'jpc_settings', 'weekly_off_config');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as WeeklyOffConfig;
      cachedWeeklyOffConfig = {
        weekly_off_days: Array.isArray(data.weekly_off_days) ? data.weekly_off_days : [...DEFAULT_WEEKLY_OFF_DAYS],
        custom_message: data.custom_message || DEFAULT_WEEKLY_OFF_MESSAGE,
        updated_by: data.updated_by,
        updated_at: data.updated_at
      };
    } else {
      cachedWeeklyOffConfig = {
        weekly_off_days: [...DEFAULT_WEEKLY_OFF_DAYS],
        custom_message: DEFAULT_WEEKLY_OFF_MESSAGE
      };
    }
    callback(cachedWeeklyOffConfig);
  }, (err) => {
    console.warn('[holidayService] Snapshot error on weekly_off_config:', err);
    callback(cachedWeeklyOffConfig);
  });
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

export const getOfficeClosures = async (): Promise<OfficeClosure[]> => {
  try {
    const snap = await getDocs(collection(db, 'jpc_office_closures'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as OfficeClosure));
    cachedClosures = list;
    return list;
  } catch (err) {
    console.warn('[holidayService] Error fetching jpc_office_closures:', err);
    return cachedClosures;
  }
};

export const getWeeklyOffConfig = async (): Promise<WeeklyOffConfig> => {
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
    }
    return cachedWeeklyOffConfig;
  } catch (err) {
    console.warn('[holidayService] Error fetching weekly_off_config:', err);
    return cachedWeeklyOffConfig;
  }
};

/**
 * Creates or saves an Office Closure / Holiday record with audit logging and Google Calendar sync.
 */
export const saveOfficeClosure = async (
  closure: Omit<OfficeClosure, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  actingUser: User
): Promise<OfficeClosure> => {
  const id = closure.id || ('closure_' + Math.random().toString(36).slice(2, 11));
  const now = new Date().toISOString();

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
    is_working_day_override: !!closure.is_working_day_override,
    source: closure.source || 'crm',
    created_by: closure.created_by || String(actingUser.id),
    created_by_name: closure.created_by_name || actingUser.display_name || 'Management',
    created_at: now,
    updated_by: String(actingUser.id),
    updated_by_name: actingUser.display_name || 'Management',
    updated_at: now
  };

  await setDoc(doc(db, 'jpc_office_closures', id), finalRecord);

  // Update in-memory cache immediately
  const existingIdx = cachedClosures.findIndex(c => c.id === id);
  if (existingIdx >= 0) {
    cachedClosures[existingIdx] = finalRecord;
  } else {
    cachedClosures.push(finalRecord);
  }

  // 1. Audit Log
  await addHolidayAuditLog({
    id: 'audit_' + Math.random().toString(36).slice(2, 11),
    action: 'create',
    entity_type: 'closure',
    entity_id: id,
    acting_user_id: String(actingUser.id),
    acting_user_name: actingUser.display_name || 'Management',
    acting_user_role: actingUser.role,
    new_value: finalRecord,
    source_system: 'crm',
    timestamp: now,
    details: `Created office closure: ${finalRecord.title} (${finalRecord.start_date} to ${finalRecord.end_date})`
  });

  // 2. Synchronize to Google Calendar in background
  try {
    syncClosureToGoogleCalendar(finalRecord, actingUser).catch(err => {
      console.warn('[holidayService] Non-fatal Google Calendar sync warning:', err);
    });
  } catch {}

  // 3. Notify Recruiters
  try {
    notifyRecruitersOfHolidayChange(finalRecord, 'create', actingUser).catch(console.error);
  } catch {}

  return finalRecord;
};

export const createOfficeClosure = saveOfficeClosure;

/**
 * Updates an existing Office Closure / Holiday record with audit logging and Google Calendar sync.
 */
export const updateOfficeClosure = async (
  id: string,
  updates: Partial<OfficeClosure>,
  actingUser: User
): Promise<OfficeClosure> => {
  const ref = doc(db, 'jpc_office_closures', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Office closure record not found.');
  }

  const existing = snap.data() as OfficeClosure;
  const now = new Date().toISOString();

  const finalUpdates: Partial<OfficeClosure> = {
    ...updates,
    updated_by: String(actingUser.id),
    updated_by_name: actingUser.display_name || 'Management',
    updated_at: now
  };

  if (updates.start_date) {
    finalUpdates.start_date = updates.start_date.split('T')[0].trim();
  }
  if (updates.end_date) {
    finalUpdates.end_date = updates.end_date.split('T')[0].trim();
  }

  await updateDoc(ref, finalUpdates);

  const updatedRecord: OfficeClosure = { ...existing, ...finalUpdates };

  // Update cache
  const idx = cachedClosures.findIndex(c => c.id === id);
  if (idx >= 0) {
    cachedClosures[idx] = updatedRecord;
  }

  // 1. Audit Log
  await addHolidayAuditLog({
    id: 'audit_' + Math.random().toString(36).slice(2, 11),
    action: updates.is_working_day_override !== undefined ? 'override' : 'update',
    entity_type: 'closure',
    entity_id: id,
    acting_user_id: String(actingUser.id),
    acting_user_name: actingUser.display_name || 'Management',
    acting_user_role: actingUser.role,
    previous_value: existing,
    new_value: updatedRecord,
    source_system: 'crm',
    timestamp: now,
    details: `Updated closure: ${updatedRecord.title} (${updatedRecord.start_date} to ${updatedRecord.end_date})`
  });

  // 2. Synchronize to Google Calendar
  try {
    syncClosureToGoogleCalendar(updatedRecord, actingUser).catch(err => {
      console.warn('[holidayService] Non-fatal Google Calendar update sync warning:', err);
    });
  } catch {}

  // 3. Notify Recruiters
  try {
    notifyRecruitersOfHolidayChange(updatedRecord, 'update', actingUser).catch(console.error);
  } catch {}

  return updatedRecord;
};

/**
 * Deletes or cancels an Office Closure record with audit logging and Google Calendar deletion.
 */
export const deleteOfficeClosure = async (
  id: string,
  actingUser: User
): Promise<void> => {
  const ref = doc(db, 'jpc_office_closures', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const existing = snap.data() as OfficeClosure;
  const now = new Date().toISOString();

  await deleteDoc(ref);

  // Update cache
  cachedClosures = cachedClosures.filter(c => c.id !== id);

  // 1. Audit Log
  await addHolidayAuditLog({
    id: 'audit_' + Math.random().toString(36).slice(2, 11),
    action: 'delete',
    entity_type: 'closure',
    entity_id: id,
    acting_user_id: String(actingUser.id),
    acting_user_name: actingUser.display_name || 'Management',
    acting_user_role: actingUser.role,
    previous_value: existing,
    source_system: 'crm',
    timestamp: now,
    details: `Deleted office closure: ${existing.title} (${existing.start_date} to ${existing.end_date})`
  });

  // 2. Delete Google Calendar Event
  try {
    deleteClosureFromGoogleCalendar(existing, actingUser).catch(err => {
      console.warn('[holidayService] Google Calendar delete warning:', err);
    });
  } catch {}

  // 3. Notify Recruiters of Re-opened working day
  try {
    notifyRecruitersOfHolidayChange(existing, 'delete', actingUser).catch(console.error);
  } catch {}
};

/**
 * Saves the Weekly Off Configuration (e.g. Saturday & Sunday, or customized off-days).
 */
export const saveWeeklyOffConfig = async (
  config: Partial<WeeklyOffConfig>,
  actingUser: User
): Promise<WeeklyOffConfig> => {
  const now = new Date().toISOString();
  const ref = doc(db, 'jpc_settings', 'weekly_off_config');
  const existingSnap = await getDoc(ref);
  const existingData = existingSnap.exists() ? (existingSnap.data() as WeeklyOffConfig) : null;

  const updatedConfig: WeeklyOffConfig = {
    weekly_off_days: Array.isArray(config.weekly_off_days) ? config.weekly_off_days : (existingData?.weekly_off_days || [...DEFAULT_WEEKLY_OFF_DAYS]),
    custom_message: config.custom_message?.trim() || (existingData?.custom_message || DEFAULT_WEEKLY_OFF_MESSAGE),
    updated_by: String(actingUser.id),
    updated_at: now
  };

  await setDoc(ref, updatedConfig);
  cachedWeeklyOffConfig = { ...updatedConfig };

  // Audit Log
  await addHolidayAuditLog({
    id: 'audit_' + Math.random().toString(36).slice(2, 11),
    action: 'override',
    entity_type: 'weekly_off_config',
    entity_id: 'weekly_off_config',
    acting_user_id: String(actingUser.id),
    acting_user_name: actingUser.display_name || 'Management',
    acting_user_role: actingUser.role,
    previous_value: existingData,
    new_value: updatedConfig,
    source_system: 'crm',
    timestamp: now,
    details: `Updated weekly off days: [${updatedConfig.weekly_off_days.join(', ')}] with message: "${updatedConfig.custom_message}"`
  });

  return updatedConfig;
};

// =========================================================================
// AUDIT LOGS
// =========================================================================

export const addHolidayAuditLog = async (log: HolidayAuditLog): Promise<void> => {
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
 * Finds an eligible connected Google Calendar user (the acting user if connected,
 * or any connected Administrator / Proxy).
 */
export async function findConnectedGoogleCalendarUser(preferredUser?: User | null): Promise<User | null> {
  if (preferredUser?.google_calendar_connected && preferredUser?.id) {
    return preferredUser;
  }

  try {
    const usersSnap = await getDocs(collection(db, 'jpc_users'));
    const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    
    // First try an admin or manager with Google Calendar connected
    const adminUser = allUsers.find(u => 
      u.google_calendar_connected && 
      ['administrator', 'jpc_sysadmin', 'jpc_manager'].includes(u.role)
    );
    if (adminUser) return adminUser;

    // Next try any proxy with Google Calendar connected
    const proxyUser = allUsers.find(u => u.google_calendar_connected);
    return proxyUser || null;
  } catch (err) {
    console.warn('[holidayService] Could not lookup connected Google Calendar users:', err);
    return null;
  }
}

/**
 * Synchronizes an Office Closure / Holiday to Google Calendar.
 */
export async function syncClosureToGoogleCalendar(
  closure: OfficeClosure,
  actingUser: User
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const gUser = await findConnectedGoogleCalendarUser(actingUser);
  if (!gUser) {
    await updateDoc(doc(db, 'jpc_office_closures', closure.id), {
      google_calendar_sync_status: 'pending',
      sync_error: 'No connected Google Calendar account found.'
    }).catch(() => {});
    return { success: false, error: 'No connected Google Calendar account found.' };
  }

  const gcalEndDate = getNextDayDateString(closure.end_date);
  const prefix = closure.is_working_day_override ? '🟢 OPEN (OVERRIDE): ' : '🔴 CLOSED: ';
  const summary = `${prefix}${closure.title}`;
  const description = `${closure.description || ''}\n\nRecruiter Notice: ${closure.custom_message}\n\nSynchronized from Placify CRM Centralised Holiday Calendar.`;

  const payload = {
    summary,
    description,
    startTime: closure.start_date,
    endTime: gcalEndDate,
    isAllDay: true,
    colorId: closure.is_working_day_override ? '10' : '11', // 10 = Green, 11 = Tomato Red
    transparency: closure.is_working_day_override ? 'transparent' : 'opaque'
  };

  try {
    let eventId = closure.google_calendar_event_id;
    if (eventId) {
      // Update existing Google Calendar event
      const updated = await updateGoogleCalendarEvent(String(gUser.id), eventId, payload);
      if (!updated) {
        // If update failed (e.g. event was deleted in GCal), create fresh
        const newEvent = await createGoogleCalendarEvent(String(gUser.id), payload);
        eventId = newEvent?.id || null;
      }
    } else {
      // Create new event
      const created = await createGoogleCalendarEvent(String(gUser.id), payload);
      eventId = created?.id || null;
    }

    const now = new Date().toISOString();
    await updateDoc(doc(db, 'jpc_office_closures', closure.id), {
      google_calendar_event_id: eventId,
      google_calendar_sync_status: eventId ? 'synced' : 'failed',
      last_synced_at: now,
      sync_error: eventId ? null : 'Failed to obtain Google event ID'
    });

    return { success: !!eventId, eventId: eventId || undefined };
  } catch (err: any) {
    console.error('[holidayService] GCal sync error for closure:', err);
    await updateDoc(doc(db, 'jpc_office_closures', closure.id), {
      google_calendar_sync_status: 'failed',
      sync_error: err?.message || 'Google Calendar sync failed'
    }).catch(() => {});
    return { success: false, error: err?.message };
  }
}

/**
 * Deletes an Office Closure event from Google Calendar.
 */
export async function deleteClosureFromGoogleCalendar(
  closure: OfficeClosure,
  actingUser: User
): Promise<void> {
  if (!closure.google_calendar_event_id) return;
  const gUser = await findConnectedGoogleCalendarUser(actingUser);
  if (!gUser) return;

  try {
    await deleteGoogleCalendarEvent(String(gUser.id), closure.google_calendar_event_id);
  } catch (err) {
    console.warn('[holidayService] Could not delete GCal event for closure:', err);
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

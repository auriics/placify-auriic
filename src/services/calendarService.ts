import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { parseLocalTimeToDate, isUserOnLeaveDuring, getEasternDate, formatLeavePeriod } from '../lib/utils';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  startTime: string; // ISO format string or YYYY-MM-DD
  endTime: string; // ISO format string or YYYY-MM-DD
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  colorId?: string; // e.g. "11" for Google Calendar Tomato / Red
  transparency?: 'opaque' | 'transparent'; // 'opaque' = Busy, 'transparent' = Free
  isAllDay?: boolean;
}

/**
 * Calculates the next calendar day in YYYY-MM-DD format using UTC date arithmetic.
 * Essential for Google Calendar all-day event end dates which are exclusive.
 */
export function getNextDayDateString(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day));
    d.setUTCDate(d.getUTCDate() + 1);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dayOfMonth}`;
  }
  return dateStr;
}

/**
 * Builds the standard Google Calendar event payload for a proxy's leave period.
 * Formats:
 * - Summary: 🔴 ON LEAVE: <ProxyName> (<Duration>)
 * - Description: Detailed proxy leave notice with EST time window
 * - Color ID: "11" (Tomato / Red)
 * - Transparency: 'opaque' (Marks calendar Busy)
 * - Start/End: All-day date range in YYYY-MM-DD with exclusive end date
 */
export function buildProxyLeaveCalendarPayload(
  proxyName: string,
  leaveStartDate: string,
  leaveEndDate: string,
  proxyEmail?: string | null
): CalendarEventPayload {
  const effectiveStart = leaveStartDate;
  const effectiveEnd = leaveEndDate >= leaveStartDate ? leaveEndDate : leaveStartDate;
  const googleCalendarEndDate = getNextDayDateString(effectiveEnd);
  const durationText = formatLeavePeriod(effectiveStart, effectiveEnd);

  const summary = `🔴 ON LEAVE: ${proxyName} (${durationText})`;
  const description = `🔴 PROXY ON LEAVE NOTICE
Team Member: ${proxyName}
Leave Duration: ${durationText} (EST)
Leave Period: ${effectiveStart} to ${effectiveEnd}
Status: Unavailable for interview assignments and proxy bookings.

Synchronized automatically from Placify CRM Interview Support System.`;

  return {
    summary,
    description,
    startTime: effectiveStart,
    endTime: googleCalendarEndDate,
    isAllDay: true,
    colorId: '11', // Tomato (Red)
    transparency: 'opaque', // Busy
    attendees: proxyEmail ? [{ email: proxyEmail, displayName: proxyName, responseStatus: 'accepted' }] : [],
  };
}

/**
 * Ensures the Google access token for a user is valid.
 * Refreshes it if expired or nearing expiration.
 */
export async function ensureGoogleTokenValid(proxyUserId: string): Promise<string | null> {
  try {
    const userRef = doc(db, 'jpc_users', proxyUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;

    const userData = userSnap.data();
    if (!userData.google_calendar_connected) {
      return null;
    }

    const expiresAt = userData.google_access_token_expires_at || 0;
    const isExpired = expiresAt <= Date.now() + 60000; // expired or within 60 seconds

    if (!isExpired && userData.google_access_token) {
      return userData.google_access_token;
    }

    console.log(`[CalendarService] Token expired/expiring soon for proxy ${proxyUserId}. Refreshing.`);
    return await refreshAccessToken(proxyUserId);
  } catch (error) {
    console.error('[CalendarService] Error in ensureGoogleTokenValid:', error);
    return null;
  }
}

/**
 * Triggers backend route to refresh the Google access token.
 */
export async function refreshAccessToken(proxyUserId: string): Promise<string | null> {
  try {
    console.log(`[CalendarService] Querying server refresh token API for proxy ${proxyUserId}...`);
    const response = await fetch('/api/auth/google/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proxyUserId }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error(`[CalendarService] Server refresh failed for user ${proxyUserId}:`, errData);
      
      if (response.status === 401 || errData.error === 'invalid_grant' || errData.message?.includes('grant')) {
        console.warn(`[CalendarService] Refresh token invalid/revoked. Setting status to attention_required.`);
        const userRef = doc(db, 'jpc_users', proxyUserId);
        await updateDoc(userRef, {
          google_calendar_status: 'attention_required'
        });
      }
      return null;
    }

    const data = await response.json();
    return data.accessToken || null;
  } catch (error) {
    console.error('[CalendarService] Error in refreshAccessToken call:', error);
    return null;
  }
}

/**
 * Updates an event in the proxy's real Google Calendar
 */
export async function updateGoogleCalendarEvent(
  proxyUserId: string,
  eventId: string,
  payload: CalendarEventPayload
): Promise<string | null | 'NOT_FOUND'> {
  try {
    const userRef = doc(db, 'jpc_users', proxyUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.warn(`[CalendarService] Proxy user ${proxyUserId} not found in database.`);
      return null;
    }

    const userData = userSnap.data();
    if (!userData.google_calendar_connected) {
      console.log(`[CalendarService] Proxy user ${proxyUserId} has not connected their Google Calendar yet.`);
      return null;
    }

    const accessToken = await ensureGoogleTokenValid(proxyUserId);
    if (!accessToken) {
      console.warn(`[CalendarService] Could not obtain a valid Google access token for proxy ${proxyUserId}. aborting update.`);
      return null;
    }

    // Google Calendar API Event Update Endpoint
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`;
    
    const isAllDay = payload.isAllDay || (payload.startTime.length === 10 && payload.endTime.length === 10);
    const body: any = {
      summary: payload.summary,
      description: payload.description,
      start: isAllDay
        ? { date: payload.startTime }
        : {
            dateTime: payload.startTime,
            timeZone: 'America/New_York',
          },
      end: isAllDay
        ? { date: payload.endTime }
        : {
            dateTime: payload.endTime,
            timeZone: 'America/New_York',
          },
      attendees: payload.attendees || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    };

    if (payload.colorId) {
      body.colorId = payload.colorId;
    }
    if (payload.transparency) {
      body.transparency = payload.transparency;
    }

    console.log(`[CalendarService] Updating event ${eventId} in Google Calendar for ${userData.google_calendar_email}...`);

    let response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      console.warn(`[CalendarService] Google PUT returned 401. Forcing refresh and retrying.`);
      const newAccessToken = await refreshAccessToken(proxyUserId);
      if (newAccessToken) {
        response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      }
    }

    if (response.status === 401) {
      console.error(`[CalendarService] Access token invalid/expired even after refresh for proxy ${proxyUserId}. Marking attention_required.`);
      await updateDoc(userRef, {
        google_calendar_status: 'attention_required',
      });
      return null;
    }

    if (response.status === 404) {
      console.warn(`[CalendarService] Event ${eventId} not found in Google Calendar.`);
      return 'NOT_FOUND';
    }

    if (!response.ok) {
      const errTxt = await response.text();
      console.error(`[CalendarService] Google Calendar API error during update:`, errTxt);
      return null;
    }

    const resData = await response.json();
    console.log(`[CalendarService] Successfully updated Google Calendar event:`, resData.id);
    return resData.id;
  } catch (error) {
    console.error('[CalendarService] Error in updateGoogleCalendarEvent:', error);
    return null;
  }
}

/**
 * Creates an event in the proxy's real Google Calendar
 */
export async function createGoogleCalendarEvent(
  proxyUserId: string,
  payload: CalendarEventPayload
): Promise<string | null> {
  try {
    const userRef = doc(db, 'jpc_users', proxyUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.warn(`[CalendarService] Proxy user ${proxyUserId} not found in database.`);
      return null;
    }

    const userData = userSnap.data();
    if (!userData.google_calendar_connected) {
      console.log(`[CalendarService] Proxy user ${proxyUserId} has not connected their Google Calendar yet.`);
      return null;
    }

    const accessToken = await ensureGoogleTokenValid(proxyUserId);
    if (!accessToken) {
      console.warn(`[CalendarService] Could not obtain a valid Google access token for proxy ${proxyUserId}. aborting creation.`);
      return null;
    }

    // Google Calendar API Event Insert Endpoint
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all';
    
    const isAllDay = payload.isAllDay || (payload.startTime.length === 10 && payload.endTime.length === 10);
    const body: any = {
      summary: payload.summary,
      description: payload.description,
      start: isAllDay
        ? { date: payload.startTime }
        : {
            dateTime: payload.startTime, // Local ISO time e.g. "2026-06-08T17:00:00"
            timeZone: 'America/New_York', // Enforce EST America/New_York
          },
      end: isAllDay
        ? { date: payload.endTime }
        : {
            dateTime: payload.endTime, // Local ISO time
            timeZone: 'America/New_York', // Enforce EST America/New_York
          },
      attendees: payload.attendees || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    };

    if (payload.colorId) {
      body.colorId = payload.colorId;
    }
    if (payload.transparency) {
      body.transparency = payload.transparency;
    }

    console.log(`[CalendarService] Syncing event to Google Calendar for ${userData.google_calendar_email}...`);

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      console.warn(`[CalendarService] Google POST returned 401. Forcing refresh and retrying.`);
      const newAccessToken = await refreshAccessToken(proxyUserId);
      if (newAccessToken) {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      }
    }

    if (response.status === 401) {
      console.error(`[CalendarService] Access token invalid/expired even after refresh for proxy ${proxyUserId}. Marking attention_required.`);
      await updateDoc(userRef, {
        google_calendar_status: 'attention_required',
      });
      return null;
    }

    if (!response.ok) {
      const errTxt = await response.text();
      console.error(`[CalendarService] Google Calendar API error:`, errTxt);
      return null;
    }

    const resData = await response.json();
    console.log(`[CalendarService] Successfully created Google Calendar event:`, resData.id);
    return resData.id;
  } catch (error) {
    console.error('[CalendarService] Error in createGoogleCalendarEvent:', error);
    return null;
  }
}

/**
 * Triggers Google Calendar synchronization for a specific interview round.
 * Resolves proxy, candidate, and recruiter data and initiates Google Calendar insertion.
 */
export async function syncInterviewRoundToGoogleCalendar(
  roundId: string,
  requestId: string,
  proxyUserId: string
): Promise<boolean> {
  try {
    if (!proxyUserId) return false;

    // 1. Retrieve Round and Request Details
    const roundSnap = await getDoc(doc(db, 'jpc_interview_rounds', roundId));
    const requestSnap = await getDoc(doc(db, 'jpc_interview_requests', requestId));

    if (!roundSnap.exists() || !requestSnap.exists()) {
      console.warn('[CalendarService] Round or Request doc does not exist.');
      return false;
    }

    const round = roundSnap.data();
    const request = requestSnap.data();

    if (!round.booked_slot_time || !round.booked_slot_end) {
      console.log('[CalendarService] Round is not scheduled (missing slot times).');
      return false;
    }

    // 2. Fetch Candidate Details
    let candidateName = 'Candidate';
    let candidateEmail = '';
    if (request.candidate_id) {
      const candSnap = await getDoc(doc(db, 'jpc_candidates', request.candidate_id));
      if (candSnap.exists()) {
        const cData = candSnap.data();
        candidateName = cData.full_name || 'Candidate';
        candidateEmail = cData.email || '';
      }
    }

    // 3. Fetch Recruiter and Proxy Details
    let recruiterEmail = '';
    if (request.recruiter_id && request.recruiter_id !== 'system') {
      const recSnap = await getDoc(doc(db, 'jpc_users', request.recruiter_id));
      if (recSnap.exists()) {
        recruiterEmail = recSnap.data().email || '';
      }
    }

    const proxySnap = await getDoc(doc(db, 'jpc_users', proxyUserId));
    let proxyEmail = '';
    let proxyName = 'Proxy Support Expert';
    if (proxySnap.exists()) {
      const pData = proxySnap.data();
      proxyEmail = pData.email || pData.google_calendar_email || '';
      proxyName = pData.display_name || 'Proxy Support Expert';
    }

    // Build description
    const description = `This interview support session has been automatically scheduled and matched.

Candidate: ${candidateName}
Company Name: ${request.interview_company_name || 'Client Company'}
Interview Round: ${round.round_label || 'Technical Round'}

Time: ${round.booked_slot_time} - ${round.booked_slot_end} (America/New_York EST)
Status: Confirmed

Contact Support: Coordinated via AI Auto Job Apply System.`;

    // Compile Attendees
    const attendees: { email: string; displayName?: string; responseStatus?: string }[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (proxyEmail && emailRegex.test(proxyEmail)) {
      attendees.push({ email: proxyEmail, displayName: proxyName, responseStatus: 'accepted' });
    }
    if (candidateEmail && emailRegex.test(candidateEmail)) {
      attendees.push({ email: candidateEmail, displayName: candidateName });
    }
    if (recruiterEmail && emailRegex.test(recruiterEmail)) {
      attendees.push({ email: recruiterEmail, displayName: 'Placify Recruiter' });
    }

    const payload: CalendarEventPayload = {
      summary: `Interview Support: ${candidateName} at ${request.interview_company_name} [${round.round_label}]`,
      description,
      startTime: round.booked_slot_time, // e.g. "2026-06-08T14:30:00"
      endTime: round.booked_slot_end,
      attendees,
    };

    const q = query(
      collection(db, 'jpc_calendar_events'),
      where('interview_round_id', '==', roundId)
    );
    const calendarEventsSnap = await getDocs(q);
    const existingSyncRecord = calendarEventsSnap.empty ? null : calendarEventsSnap.docs[0];
    const existingSyncData = existingSyncRecord?.data();
    const existingEventId = existingSyncData?.google_event_id;
    const existingProxyId = existingSyncData?.proxy_user_id;

    let link: string | null | 'NOT_FOUND' = null;
    let recordToUpdate = existingSyncRecord;

    // If proxy has changed, we MUST delete the event from the old proxy's calendar
    if (existingEventId && existingProxyId && existingProxyId !== proxyUserId) {
      console.log(`[CalendarService] Proxy changed from ${existingProxyId} to ${proxyUserId}. Deleting old event.`);
      await deleteGoogleCalendarEvent(existingProxyId, existingEventId);
      await deleteDoc(doc(db, 'jpc_calendar_events', existingSyncRecord!.id));
      recordToUpdate = null;
      link = await createGoogleCalendarEvent(proxyUserId, payload);
    } else if (existingEventId) {
      link = await updateGoogleCalendarEvent(proxyUserId, existingEventId, payload);
      
      // If event was not found on Google, delete the local record and recreate in next sync
      if (link === 'NOT_FOUND') {
        console.log('[CalendarService] Event not found on Google, clearing local record to recreate.');
        await deleteDoc(doc(db, 'jpc_calendar_events', existingSyncRecord!.id));
        recordToUpdate = null; 
        link = await createGoogleCalendarEvent(proxyUserId, payload);
      }
    } else {
      link = await createGoogleCalendarEvent(proxyUserId, payload);
    }
    
    if (link) {
      const calendarEventData = {
        interview_round_id: roundId,
        interview_request_id: requestId,
        summary: payload.summary,
        start_time: round.booked_slot_time,
        end_time: round.booked_slot_end,
        proxy_user_id: proxyUserId,
        google_event_id: link,
        candidate_name: candidateName,
        company_name: request.interview_company_name,
        status: 'synced',
        notifications_sent: true,
        updated_at: new Date().toISOString()
      };

      if (!recordToUpdate) {
        await addDoc(collection(db, 'jpc_calendar_events'), {
          ...calendarEventData,
          created_at: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, 'jpc_calendar_events', recordToUpdate.id), calendarEventData);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('[CalendarService] Error in syncInterviewRoundToGoogleCalendar:', error);
    return false;
  }
}

/**
 * Deletes an event from the proxy's real Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  proxyUserId: string,
  eventId: string
): Promise<boolean> {
  try {
    const userRef = doc(db, 'jpc_users', proxyUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return false;
    }

    const userData = userSnap.data();
    if (!userData.google_calendar_connected) {
      return false;
    }

    const accessToken = await ensureGoogleTokenValid(proxyUserId);
    if (!accessToken) {
      console.warn(`[CalendarService] Could not obtain a valid Google access token for proxy ${proxyUserId}. aborting delete.`);
      return false;
    }

    // Try to extract the direct event ID if eventId is a URL or full link
    let idToUse = eventId;
    if (eventId.startsWith('http')) {
      try {
        const urlObj = new URL(eventId);
        const eid = urlObj.searchParams.get('eid');
        if (eid) {
          const decoded = atob(eid).split(' ')[0];
          if (decoded) idToUse = decoded;
        } else {
          const lastSegment = urlObj.pathname.split('/').pop();
          if (lastSegment) idToUse = lastSegment;
        }
      } catch (_) {}
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(idToUse)}?sendUpdates=all`;

    console.log(`[CalendarService] Deleting event ${idToUse} from Google Calendar for ${userData.google_calendar_email}...`);

    let response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      console.warn(`[CalendarService] Google DELETE returned 401. Forcing refresh and retrying.`);
      const newAccessToken = await refreshAccessToken(proxyUserId);
      if (newAccessToken) {
        response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
          },
        });
      }
    }

    if (response.status === 401) {
      console.error(`[CalendarService] Access token invalid/expired even after refresh for proxy ${proxyUserId}. Marking attention_required.`);
      await updateDoc(userRef, {
        google_calendar_status: 'attention_required',
      });
      return false;
    }

    if (response.status === 404 || response.status === 410) {
      console.warn(`[CalendarService] Event ${idToUse} already deleted from Google Calendar.`);
      return true;
    }

    if (!response.ok) {
      const errTxt = await response.text();
      console.error(`[CalendarService] Google Calendar API Delete error:`, errTxt);
      return false;
    }

    console.log(`[CalendarService] Successfully deleted event from Google Calendar:`, idToUse);
    return true;
  } catch (error) {
    console.error('[CalendarService] Error in deleteGoogleCalendarEvent:', error);
    return false;
  }
}

/**
 * Checks real-time availability for a proxy user using Google Calendar freebusy query
 */
export async function checkProxyAvailability(
  proxyUserId: string,
  startTime: string,
  endTime: string
): Promise<{ isAvailable: boolean; error?: string }> {
  try {
    const accessToken = await ensureGoogleTokenValid(proxyUserId);
    if (!accessToken) {
      return { isAvailable: false, error: 'Google Calendar not connected or token invalid.' };
    }

    const userRef = doc(db, 'jpc_users', proxyUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { isAvailable: false, error: 'Proxy user not found.' };
    
    const userData = userSnap.data();

    // 0. Check internal leave status (EST date-range & override aware)
    if (userData.is_on_leave || userData.leave_start_date || userData.leave_end_date || userData.leave_return_date) {
      if (isUserOnLeaveDuring(userData, startTime, endTime)) {
        console.log(`[CalendarService] User on leave during requested window (${startTime} to ${endTime}) EST`);
        return { isAvailable: false };
      }
    }

    const calendarId = userData.google_calendar_email || 'primary';

    // 1. First check via FreeBusy API (Standard)
    const freeBusyUrl = 'https://www.googleapis.com/calendar/v3/freeBusy';
    const freeBusyBody = {
      timeMin: startTime,
      timeMax: endTime,
      items: [{ id: calendarId }]
    };

    let response = await fetch(freeBusyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(freeBusyBody)
    });

    if (response.status === 401) {
      const newAccessToken = await refreshAccessToken(proxyUserId);
      if (newAccessToken) {
        response = await fetch(freeBusyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(freeBusyBody)
        });
      }
    }

    if (response.ok) {
      const data = await response.json();
      const busy = data.calendars[calendarId]?.busy || [];
      if (busy.length > 0) {
        return { isAvailable: false };
      }
    }

    // 2. Secondary check via Events List (More robust for "On Leave" / all-day events)
    // We check for any events in this window that are not explicitly marked as 'transparent' (free)
    // AND we check for keywords in titles just in case
    const listUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` + new URLSearchParams({
      timeMin: startTime,
      timeMax: endTime,
      singleEvents: 'true',
      maxResults: '10'
    }).toString();

    const listResponse = await fetch(listUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      const events = listData.items || [];
      
      for (const event of events) {
        // If event is Out of Office (OOO) type, it's a conflict
        if (event.eventType === 'outOfOffice') return { isAvailable: false };

        // If it's a regular event, check if it's marked as Busy (transparency is not 'transparent')
        // OR if it contains keywords like "Leave", "OOO", "Vacation" (people sometimes mark these as free but mean busy)
        const summary = (event.summary || '').toLowerCase();
        const isLeaveKeyword = summary.includes('leave') || 
                              summary.includes('ooo') || 
                              summary.includes('vacation') || 
                              summary.includes('out of office');

        if (event.transparency !== 'transparent' || isLeaveKeyword) {
          console.log(`[CalendarService] Conflict found in list check: ${event.summary} (${event.transparency})`);
          return { isAvailable: false };
        }
      }
    }

    return { isAvailable: true };
  } catch (error) {
    console.error('[CalendarService] Error in checkProxyAvailability:', error);
    return { isAvailable: false, error: 'An error occurred while checking availability.' };
  }
}

/**
 * Resolves and deletes all existing calendar events for a specific interview round.
 */
export async function clearPreviousCalendarEvents(roundId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'jpc_calendar_events'),
      where('interview_round_id', '==', roundId)
    );
    const snap = await getDocs(q);
    let count = 0;
    
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const proxyUserId = data.proxy_user_id;
      const googleEventId = data.google_event_id;
      
      if (proxyUserId && googleEventId) {
        await deleteGoogleCalendarEvent(proxyUserId, googleEventId);
      }
      await deleteDoc(doc(db, 'jpc_calendar_events', docSnap.id));
      count++;
    }
    
    return count;
  } catch (error) {
    console.error('[CalendarService] Error clearing previous calendar events:', error);
    return 0;
  }
}

/**
 * Resolves and deletes all existing calendar events for a specific proxy.
 */
export async function clearAllProxyCalendarEvents(proxyUserId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'jpc_calendar_events'),
      where('proxy_user_id', '==', proxyUserId)
    );
    const snap = await getDocs(q);
    let count = 0;
    
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const googleEventId = data.google_event_id;
      
      if (googleEventId) {
        await deleteGoogleCalendarEvent(proxyUserId, googleEventId);
      }
      await deleteDoc(doc(db, 'jpc_calendar_events', docSnap.id));
      count++;
    }
    
    return count;
  } catch (error) {
    console.error('[CalendarService] Error clearing all calendar events:', error);
    return 0;
  }
}



/**
 * Synchronizes a proxy team member's complete leave date range to their connected Google Calendar.
 * 
 * - If leave is active (has dates or isIndefinite):
 *   - Inserts or updates an all-day event in their Google Calendar with red ON LEAVE label (colorId: '11', opaque).
 *   - Displays: 🔴 ON LEAVE: <Name> (<Duration>)
 *   - Stores/updates record in 'jpc_calendar_events' with event_type: 'proxy_leave'.
 * - If leave is cancelled/cleared:
 *   - Removes the leave event from Google Calendar and deletes the record from 'jpc_calendar_events'.
 */
export async function syncProxyLeaveToGoogleCalendar(
  proxyUserId: string,
  leaveStartDate?: string | null,
  leaveEndDate?: string | null,
  isIndefinite: boolean = false
): Promise<{ success: boolean; eventId?: string | null; action: 'created' | 'updated' | 'deleted' | 'skipped' }> {
  try {
    if (!proxyUserId) {
      return { success: false, action: 'skipped' };
    }

    const userRef = doc(db, 'jpc_users', String(proxyUserId));
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { success: false, action: 'skipped' };
    }

    const userData = userSnap.data();
    const proxyName = userData.display_name || userData.full_name || 'Proxy Support';
    const proxyEmail = userData.email || userData.google_calendar_email || '';

    // Look for existing leave sync record
    const leaveQ = query(
      collection(db, 'jpc_calendar_events'),
      where('proxy_user_id', '==', String(proxyUserId)),
      where('event_type', '==', 'proxy_leave')
    );
    const existingSnap = await getDocs(leaveQ);
    const existingDoc = existingSnap.empty ? null : existingSnap.docs[0];
    const existingData = existingDoc?.data();
    const existingEventId = existingData?.google_event_id;

    const isLeaveActive = Boolean(isIndefinite || leaveStartDate || leaveEndDate);

    // CASE 1: Leave cancelled or cleared -> delete Google Calendar event and local record
    if (!isLeaveActive) {
      if (existingEventId && userData.google_calendar_connected) {
        await deleteGoogleCalendarEvent(proxyUserId, existingEventId);
      }
      if (existingDoc) {
        await deleteDoc(doc(db, 'jpc_calendar_events', existingDoc.id));
      }
      return { success: true, action: 'deleted' };
    }

    // CASE 2: Leave active -> build event payload
    const todayEst = getEasternDate();
    const effectiveStart = leaveStartDate || todayEst;
    let effectiveEnd = leaveEndDate;
    if (!effectiveEnd) {
      if (isIndefinite) {
        const parts = effectiveStart.split('-');
        if (parts.length === 3) {
          const d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) + 30));
          effectiveEnd = d.toISOString().split('T')[0];
        } else {
          effectiveEnd = effectiveStart;
        }
      } else {
        effectiveEnd = effectiveStart;
      }
    }

    if (effectiveStart > effectiveEnd) {
      effectiveEnd = effectiveStart;
    }

    const payload = buildProxyLeaveCalendarPayload(
      proxyName,
      effectiveStart,
      effectiveEnd,
      proxyEmail
    );

    let googleEventId: string | null = null;
    let action: 'created' | 'updated' = 'created';

    if (userData.google_calendar_connected) {
      if (existingEventId && !existingEventId.startsWith('leave_')) {
        const updateRes = await updateGoogleCalendarEvent(proxyUserId, existingEventId, payload);
        if (updateRes === 'NOT_FOUND') {
          googleEventId = await createGoogleCalendarEvent(proxyUserId, payload);
          action = 'created';
        } else if (updateRes) {
          googleEventId = existingEventId;
          action = 'updated';
        }
      } else {
        googleEventId = await createGoogleCalendarEvent(proxyUserId, payload);
        action = 'created';
      }
    }

    const calendarEventData = {
      event_type: 'proxy_leave',
      proxy_user_id: String(proxyUserId),
      proxy_name: proxyName,
      summary: payload.summary,
      description: payload.description,
      start_time: `${effectiveStart}T00:00:00`,
      end_time: `${effectiveEnd}T23:59:59`,
      leave_start_date: effectiveStart,
      leave_end_date: effectiveEnd,
      google_event_id: googleEventId || existingEventId || `leave_${proxyUserId}_${effectiveStart}`,
      status: userData.google_calendar_connected && googleEventId ? 'synced' : 'pending_connection',
      updated_at: new Date().toISOString(),
    };

    if (existingDoc) {
      await updateDoc(doc(db, 'jpc_calendar_events', existingDoc.id), calendarEventData);
    } else {
      await addDoc(collection(db, 'jpc_calendar_events'), {
        ...calendarEventData,
        created_at: new Date().toISOString(),
      });
    }

    return { success: true, eventId: googleEventId, action };
  } catch (error) {
    console.error('[CalendarService] Error in syncProxyLeaveToGoogleCalendar:', error);
    return { success: false, action: 'skipped' };
  }
}

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Edit3, 
  Trash2, 
  Info, 
  Settings, 
  History, 
  X,
  CalendarCheck,
  Building,
  Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  canManageHolidayCalendar, 
  canViewHolidayCalendar, 
  canOverrideWorkingDay,
  canClearAllHolidays
} from '../lib/permissions';
import { 
  OfficeClosure, 
  OfficeClosureEventType, 
  WeeklyOffConfig, 
  HolidayAuditLog, 
  User 
} from '../types';
import { 
  subscribeToOfficeClosures, 
  subscribeToWeeklyOffConfig, 
  subscribeToHolidayAuditLogs, 
  createOfficeClosure, 
  updateOfficeClosure, 
  deleteOfficeClosure, 
  saveWeeklyOffConfig, 
  checkDateOfficeClosure, 
  getDayOfWeekEST, 
  DEFAULT_WEEKLY_OFF_DAYS, 
  DEFAULT_WEEKLY_OFF_MESSAGE,
  syncClosureToGoogleCalendar,
  syncClosuresFromGoogleCalendar,
  toggleDateWorkingStatus,
  clearHolidayForDate,
  clearOfficeClosure,
  clearAllOfficeClosures
} from '../services/holidayService';
import { cn } from '../lib/utils';
import { subscribeToCollection } from '../services/storage';

const DAYS_OF_WEEK = [
  { day: 0, name: 'Sunday', short: 'Sun' },
  { day: 1, name: 'Monday', short: 'Mon' },
  { day: 2, name: 'Tuesday', short: 'Tue' },
  { day: 3, name: 'Wednesday', short: 'Wed' },
  { day: 4, name: 'Thursday', short: 'Thu' },
  { day: 5, name: 'Friday', short: 'Fri' },
  { day: 6, name: 'Saturday', short: 'Sat' },
];

export const HolidayCalendar: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isManager = useMemo(() => canManageHolidayCalendar(user), [user]);
  const canOverride = useMemo(() => canOverrideWorkingDay(user), [user]);
  const canClearAll = useMemo(() => canClearAllHolidays(user), [user]);

  // Calendar View Month/Year in EST
  const todayDate = new Date();
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth()); // 0-11

  // Data states
  const [closures, setClosures] = useState<OfficeClosure[]>([]);
  const [weeklyConfig, setWeeklyConfig] = useState<WeeklyOffConfig>({
    weekly_off_days: [...DEFAULT_WEEKLY_OFF_DAYS],
    custom_message: DEFAULT_WEEKLY_OFF_MESSAGE
  });
  const [auditLogs, setAuditLogs] = useState<HolidayAuditLog[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // UI Panels / Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingClosure, setEditingClosure] = useState<OfficeClosure | null>(null);
  const [isWeeklySettingsOpen, setIsWeeklySettingsOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State for Event Modal
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<OfficeClosureEventType>('public_holiday');
  const [formStatus, setFormStatus] = useState<'closed' | 'open'>('closed');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCustomMessage, setFormCustomMessage] = useState('');
  const [formLocation, setFormLocation] = useState('all');
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  // Weekly Off Edit State
  const [tempWeeklyOffDays, setTempWeeklyOffDays] = useState<number[]>([...DEFAULT_WEEKLY_OFF_DAYS]);
  const [tempWeeklyMessage, setTempWeeklyMessage] = useState(DEFAULT_WEEKLY_OFF_MESSAGE);
  const [isSavingWeeklyConfig, setIsSavingWeeklyConfig] = useState(false);

  // Subscriptions
  useEffect(() => {
    const unsubClosures = subscribeToOfficeClosures(setClosures);
    const unsubConfig = subscribeToWeeklyOffConfig(config => {
      setWeeklyConfig(config);
      setTempWeeklyOffDays([...config.weekly_off_days]);
      setTempWeeklyMessage(config.custom_message || DEFAULT_WEEKLY_OFF_MESSAGE);
    });
    const unsubLogs = subscribeToHolidayAuditLogs(setAuditLogs);
    const unsubUsers = subscribeToCollection<User>('jpc_users', setAllUsers);

    return () => {
      unsubClosures();
      unsubConfig();
      unsubLogs();
      unsubUsers();
    };
  }, []);

  // Compute Calendar Grid Days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 (Sun) - 6 (Sat)

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      evaluation: ReturnType<typeof checkDateOfficeClosure>;
    }> = [];

    const formatDateStr = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Previous month padding
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dateObj = new Date(currentYear, currentMonth, -i);
      const dateStr = formatDateStr(dateObj);
      days.push({
        dateStr,
        dayNumber: dateObj.getDate(),
        isCurrentMonth: false,
        evaluation: checkDateOfficeClosure(dateStr, closures, weeklyConfig)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateStr = formatDateStr(dateObj);
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        evaluation: checkDateOfficeClosure(dateStr, closures, weeklyConfig)
      });
    }

    // Next month padding to fill a complete 35 or 42 grid
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remainingSlots = totalSlots - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const dateObj = new Date(currentYear, currentMonth + 1, d);
      const dateStr = formatDateStr(dateObj);
      days.push({
        dateStr,
        dayNumber: dateObj.getDate(),
        isCurrentMonth: false,
        evaluation: checkDateOfficeClosure(dateStr, closures, weeklyConfig)
      });
    }

    return days;
  }, [currentYear, currentMonth, closures, weeklyConfig]);

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Open Add Event Modal
  const handleOpenAddModal = (dateStr?: string) => {
    if (!isManager) {
      showToast('You do not have permission to manage holiday events.', 'error');
      return;
    }
    const defaultDate = dateStr || new Date().toISOString().split('T')[0];
    setEditingClosure(null);
    setFormTitle('');
    setFormType('public_holiday');
    setFormStatus('closed');
    setFormStartDate(defaultDate);
    setFormEndDate(defaultDate);
    setFormStartTime('');
    setFormEndTime('');
    setFormDescription('');
    setFormCustomMessage('');
    setFormLocation('all');
    setIsEventModalOpen(true);
  };

  // Open Edit Event Modal
  const handleOpenEditModal = (closure: OfficeClosure) => {
    if (!isManager) {
      showToast('You do not have permission to edit holiday events.', 'error');
      return;
    }
    setEditingClosure(closure);
    setFormTitle(closure.title);
    setFormType(closure.event_type);
    setFormStatus(closure.status || (closure.is_working_day_override ? 'open' : 'closed'));
    setFormStartDate(closure.start_date.split('T')[0]);
    setFormEndDate(closure.end_date ? closure.end_date.split('T')[0] : closure.start_date.split('T')[0]);
    setFormStartTime(closure.start_time || '');
    setFormEndTime(closure.end_time || '');
    setFormDescription(closure.description || '');
    setFormCustomMessage(closure.custom_message || '');
    setFormLocation(closure.location || 'all');
    setIsEventModalOpen(true);
  };

  // Toggle Working Day Status for a Date (Office Open <-> Office Closed)
  const handleToggleWorkingStatus = async (dateStr: string, currentEval: ReturnType<typeof checkDateOfficeClosure>) => {
    if (!canOverride) {
      showToast('Only Higher Authorities and Administrators can modify calendar working day status.', 'error');
      return;
    }

    try {
      const userActor = user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined;
      const res = await toggleDateWorkingStatus(dateStr, undefined, userActor);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast('Failed to toggle status: ' + (err.message || 'Error'), 'error');
    }
  };

  // Clear a Specific Holiday / Date (Restores Default Schedule)
  const handleClearHolidayDate = async (dateStr: string, closure?: OfficeClosure) => {
    if (!isManager) {
      showToast('You do not have permission to clear holiday entries.', 'error');
      return;
    }

    const isMultiDay = closure && closure.start_date !== closure.end_date;
    let clearEntireRange = false;

    if (isMultiDay) {
      const choice = window.confirm(
        `This date (${dateStr}) is part of a multi-day closure "${closure.title}" (${closure.start_date} to ${closure.end_date}).\n\nClick OK to clear ONLY this date (${dateStr}) and keep remaining days closed.\nClick CANCEL to clear the ENTIRE holiday date range.`
      );
      clearEntireRange = !choice;
    } else {
      if (!window.confirm(`Clear the holiday/closure on ${dateStr} and restore default schedule?`)) {
        return;
      }
    }

    try {
      const userActor = user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined;
      const res = await clearHolidayForDate(dateStr, userActor, clearEntireRange);
      showToast(res.message, 'success');
      if (isEventModalOpen) setIsEventModalOpen(false);
    } catch (err: any) {
      showToast('Failed to clear holiday: ' + (err.message || 'Error'), 'error');
    }
  };

  // Clear All Holidays (Higher Authorities and Admins Only)
  const handleClearAllHolidays = async () => {
    if (!canClearAll) {
      showToast('Only Higher Authorities and Administrators can clear all holidays.', 'error');
      return;
    }

    setIsClearingAll(true);
    try {
      const userActor = user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined;
      const res = await clearAllOfficeClosures(userActor);
      showToast(`Cleared all ${res.clearedCount} manual office closure entries. Default weekly schedule preserved.`, 'success');
      setIsClearAllModalOpen(false);
    } catch (err: any) {
      showToast('Failed to clear all holidays: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Save Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Please enter an event title.', 'error');
      return;
    }
    if (!formStartDate) {
      showToast('Please select a start date.', 'error');
      return;
    }

    const effectiveEnd = formEndDate && formEndDate >= formStartDate ? formEndDate : formStartDate;
    setIsSavingEvent(true);

    try {
      const payload: Partial<OfficeClosure> = {
        title: formTitle.trim(),
        event_type: formType,
        status: formStatus,
        start_date: formStartDate,
        end_date: effectiveEnd,
        start_time: formStartTime || null,
        end_time: formEndTime || null,
        description: formDescription.trim() || null,
        custom_message: formCustomMessage.trim() || null,
        location: formLocation || 'all',
        is_override: formStatus === 'open',
        is_working_day_override: formStatus === 'open'
      };

      const userActor = user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined;

      if (editingClosure) {
        await updateOfficeClosure(
          editingClosure.id,
          payload,
          userActor,
          'Updated holiday/closure event'
        );
        showToast('Office closure updated successfully!', 'success');
      } else {
        await createOfficeClosure(
          payload as any,
          userActor,
          'Created new office closure event'
        );
        showToast('Office closure created successfully!', 'success');
      }

      setIsEventModalOpen(false);
    } catch (err: any) {
      showToast('Failed to save event: ' + err.message, 'error');
    } finally {
      setIsSavingEvent(false);
    }
  };

  // Delete/Clear Event
  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to clear this office closure? Normal interview booking schedule will be restored.')) {
      return;
    }

    try {
      const userActor = user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined;
      await clearOfficeClosure(id, userActor, 'Cleared office closure');
      showToast('Office closure cleared. Default schedule restored.', 'success');
      setIsEventModalOpen(false);
    } catch (err: any) {
      showToast('Failed to clear closure: ' + err.message, 'error');
    }
  };

  // Save Weekly Off Config
  const handleSaveWeeklySchedule = async () => {
    if (!canOverride) {
      showToast('Only Higher Authorities and Administrators can change the weekly off schedule.', 'error');
      return;
    }

    setIsSavingWeeklyConfig(true);
    try {
      const userActor = user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined;
      await saveWeeklyOffConfig(
        {
          weekly_off_days: tempWeeklyOffDays,
          custom_message: tempWeeklyMessage.trim()
        },
        userActor
      );
      showToast('Weekly off configuration updated immediately!', 'success');
      setIsWeeklySettingsOpen(false);
    } catch (err: any) {
      showToast('Failed to save weekly schedule: ' + err.message, 'error');
    } finally {
      setIsSavingWeeklyConfig(false);
    }
  };

  // Trigger Google Calendar Sync
  const handleSyncGoogleCalendar = async () => {
    setIsSyncing(true);
    try {
      const connectedProxies = allUsers.filter(u => u.google_calendar_connected && (u.google_calendar_access_token || u.google_calendar_refresh_token));
      
      let syncCount = 0;
      for (const closure of closures) {
        if (!closure.is_working_day_override) {
          for (const proxy of connectedProxies) {
            try {
              await syncClosureToGoogleCalendar(closure, proxy.id);
              syncCount++;
            } catch (e) {
              console.warn(`[GCalSync] Failed for proxy ${proxy.id}:`, e);
            }
          }
        }
      }

      showToast(`Google Calendar synchronization complete (${syncCount} calendar events updated).`, 'success');
    } catch (err: any) {
      showToast('Google Calendar sync error: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Upcoming Closures for Notice Banner
  const upcomingClosures = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return closures
      .filter(c => c.is_active !== false && c.status !== 'open' && !c.is_working_day_override && (c.end_date || c.start_date) >= todayStr)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [closures]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in font-sans pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-secondary p-6 sm:p-8 rounded-[32px] border border-border-primary shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-accent-blue/10 text-accent-blue rounded-xl text-[10px] font-black uppercase tracking-widest border border-accent-blue/20">
              Operations & Governance
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-text-muted">
              <Globe className="w-3 h-3 text-accent-blue" /> America/New_York (EST)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
            Office Holiday & Working Day Calendar
          </h1>
          <p className="text-xs sm:text-sm font-bold text-text-muted">
            Manage office closures, working day availability, and interview booking restrictions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isManager && (
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-2 px-5 py-3.5 bg-accent-blue text-white rounded-2xl font-bold text-xs hover:bg-accent-blue/90 shadow-lg shadow-accent-blue/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Holiday / Closure
            </button>
          )}

          {canOverride && (
            <button
              onClick={() => setIsWeeklySettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-3.5 bg-bg-tertiary text-text-primary border border-border-primary rounded-2xl font-bold text-xs hover:bg-bg-tertiary/80 transition-all"
            >
              <Settings className="w-4 h-4 text-accent-blue" />
              Weekly Offs
            </button>
          )}

          {canClearAll && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-2xl font-bold text-xs hover:bg-rose-500/20 transition-all active:scale-95"
              title="Clear all manual holidays and closures"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Clear All Holidays</span>
            </button>
          )}

          <button
            onClick={handleSyncGoogleCalendar}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-3.5 bg-bg-tertiary text-text-primary border border-border-primary rounded-2xl font-bold text-xs hover:bg-bg-tertiary/80 transition-all disabled:opacity-50"
            title="Synchronize all closures to team Google Calendars"
          >
            <RefreshCw className={cn("w-4 h-4 text-accent-green", isSyncing && "animate-spin")} />
            <span className="hidden sm:inline">Sync Calendar</span>
          </button>

          <button
            onClick={() => setIsAuditLogsOpen(true)}
            className="flex items-center gap-2 px-4 py-3.5 bg-bg-tertiary text-text-primary border border-border-primary rounded-2xl font-bold text-xs hover:bg-bg-tertiary/80 transition-all"
            title="View Audit Logs"
          >
            <History className="w-4 h-4 text-text-muted" />
            <span className="hidden sm:inline">Audit History</span>
          </button>
        </div>
      </div>

      {/* Simplified Upcoming Office Closures Notice - Single Unified Card */}
      {upcomingClosures.length > 0 && (
        <div className="p-5 sm:p-6 bg-amber-500/10 border border-amber-500/25 rounded-[28px] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/30">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-amber-500 uppercase tracking-wider">
                  Upcoming Office Closures (Booking Restrictions Active)
                </h3>
                <p className="text-[11px] font-bold text-text-muted mt-0.5">
                  Interview bookings are automatically blocked for these dates.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
              {upcomingClosures.length} Active {upcomingClosures.length === 1 ? 'Closure' : 'Closures'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {upcomingClosures.map(c => (
              <div key={c.id} className="p-3.5 bg-bg-secondary rounded-2xl border border-border-primary/80 text-xs flex flex-col justify-between gap-2 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-text-primary truncate">{c.title}</span>
                    <span className="text-[9px] px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded-md font-black uppercase tracking-wider shrink-0 border border-rose-500/20">
                      OFFICE CLOSED
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-text-secondary">
                    {c.start_date === c.end_date ? c.start_date : `${c.start_date} → ${c.end_date}`}
                  </p>
                  {c.custom_message && (
                    <p className="text-[10px] text-text-muted italic line-clamp-2">
                      "{c.custom_message}"
                    </p>
                  )}
                </div>

                {isManager && (
                  <div className="pt-2 border-t border-border-primary/50 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleClearHolidayDate(c.start_date, c)}
                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-lg text-[10px] border border-rose-500/20 transition-all flex items-center gap-1"
                      title="Clear this closure and restore default schedule"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear Holiday
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="px-2.5 py-1 bg-bg-tertiary hover:bg-bg-hover text-text-primary font-bold rounded-lg text-[10px] border border-border-primary transition-all flex items-center gap-1"
                      title="Edit closure details"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Calendar Section */}
      <div className="bg-bg-secondary rounded-[36px] border border-border-primary shadow-sm p-6 sm:p-8 space-y-6">
        {/* Calendar Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent-blue/10 text-accent-blue rounded-2xl flex items-center justify-center border border-accent-blue/20">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                {monthName}
              </h2>
              <p className="text-[11px] font-bold text-text-muted">
                Observed Weekly Offs: {weeklyConfig.weekly_off_days.map(d => DAYS_OF_WEEK.find(x => x.day === d)?.name).join(', ') || 'None'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-3 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary rounded-xl border border-border-primary transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-3 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary font-bold text-xs rounded-xl border border-border-primary transition-all active:scale-95"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-3 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary rounded-xl border border-border-primary transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1 text-text-muted">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-accent-green/20 border border-accent-green/40" />
            <span>Working Day (Default Open)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-rose-500/20 border border-rose-500/40" />
            <span>Office Closed (Holiday / Manual)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-amber-500/20 border border-border-primary" />
            <span>Weekly Off (Office Closed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-500/25 border border-emerald-500" />
            <span>Office Open (Special Working Day)</span>
          </div>
        </div>

        {/* Calendar Grid Header */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {DAYS_OF_WEEK.map(d => (
            <div key={d.day} className="py-2.5 text-xs font-black uppercase tracking-wider text-text-muted">
              <span className="hidden sm:inline">{d.name}</span>
              <span className="sm:hidden">{d.short}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((item, idx) => {
            const isToday = item.dateStr === new Date().toISOString().split('T')[0];
            const evalRes = item.evaluation;
            const isClosed = evalRes.isClosed;
            const isOpenStatus = evalRes.status === 'open' && (evalRes.reason === 'override_working' || evalRes.reason === 'open');
            const isClosedStatus = evalRes.status === 'closed' && evalRes.reason !== 'weekly_off';
            const isWeeklyOff = evalRes.reason === 'weekly_off';

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[110px] sm:min-h-[135px] p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col justify-between group relative overflow-hidden",
                  !item.isCurrentMonth && "opacity-35 bg-bg-tertiary/20",
                  item.isCurrentMonth && "bg-bg-tertiary/40 hover:border-accent-blue/40",
                  isToday && "ring-2 ring-accent-blue/40 border-accent-blue",
                  isOpenStatus && "border-emerald-500/50 bg-emerald-500/10",
                  isClosedStatus && "border-rose-500/50 bg-rose-500/10",
                  isWeeklyOff && "border-border-primary bg-bg-tertiary/60"
                )}
              >
                {/* Date header */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs sm:text-sm font-black rounded-lg px-2 py-0.5",
                    isToday ? "bg-accent-blue text-white" : "text-text-primary"
                  )}>
                    {item.dayNumber}
                  </span>

                  {/* Actions for Authorized Roles */}
                  {isManager && item.isCurrentMonth && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      {canOverride && (
                        <button
                          onClick={() => handleToggleWorkingStatus(item.dateStr, evalRes)}
                          className={cn(
                            "p-1 rounded-md text-[10px] font-bold transition-colors",
                            isClosed ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                          )}
                          title={isClosed ? "Switch to Office Open" : "Switch to Office Closed"}
                        >
                          {isClosed ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        </button>
                      )}
                      {evalRes.closure && (
                        <button
                          onClick={() => handleClearHolidayDate(item.dateStr, evalRes.closure)}
                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md border border-rose-500/20 transition-colors"
                          title="Clear Holiday / Reset to Default Schedule"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (evalRes.closure) {
                            handleOpenEditModal(evalRes.closure);
                          } else {
                            handleOpenAddModal(item.dateStr);
                          }
                        }}
                        className="p-1 bg-bg-secondary text-text-muted hover:text-text-primary rounded-md border border-border-primary"
                        title={evalRes.closure ? "Edit Holiday / Closure" : "Add Holiday / Closure"}
                      >
                        {evalRes.closure ? <Edit3 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Day status badge & labels */}
                <div className="mt-1.5 flex-1 flex flex-col justify-end gap-1">
                  {isOpenStatus && (
                    <div className="p-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-[9px] sm:text-[10px] font-black text-emerald-300 leading-tight">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">OFFICE OPEN</span>
                      </div>
                      <span className="text-[8px] font-normal block opacity-80 truncate">Bookings available</span>
                    </div>
                  )}

                  {isClosedStatus && (
                    <div 
                      onClick={() => evalRes.closure && isManager && handleOpenEditModal(evalRes.closure)}
                      className="p-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-[9px] sm:text-[10px] font-black text-rose-300 leading-tight cursor-pointer hover:bg-rose-500/30 transition-all"
                    >
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">OFFICE CLOSED</span>
                      </div>
                      <span className="text-[8px] font-normal block opacity-80 truncate">{evalRes.title || 'Office Closed'}</span>
                    </div>
                  )}

                  {isWeeklyOff && !isClosedStatus && !isOpenStatus && (
                    <div className="p-1.5 rounded-xl bg-bg-secondary/70 border border-border-primary text-[9px] sm:text-[10px] font-black text-text-muted leading-tight">
                      <span className="truncate block">WEEKLY OFF</span>
                      <span className="text-[8px] font-normal block opacity-70">Office closed</span>
                    </div>
                  )}

                  {!isClosed && !isOpenStatus && (
                    <div className="text-[9px] font-bold text-accent-green/80 flex items-center gap-1 px-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                      <span className="truncate">Working Day</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Off Settings Modal */}
      <AnimatePresence>
        {isWeeklySettingsOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary w-full max-w-lg rounded-[36px] border border-border-primary shadow-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border-primary">
                <div>
                  <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">
                    Recurring Schedule
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-0.5">
                    Configure Weekly Off-Days
                  </h2>
                </div>
                <button
                  onClick={() => setIsWeeklySettingsOpen(false)}
                  className="p-2 hover:bg-bg-tertiary rounded-xl text-text-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-text-muted uppercase tracking-wider block mb-2">
                    Select Non-Working Days of the Week
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {DAYS_OF_WEEK.map(d => {
                      const isSelected = tempWeeklyOffDays.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setTempWeeklyOffDays(tempWeeklyOffDays.filter(x => x !== d.day));
                            } else {
                              setTempWeeklyOffDays([...tempWeeklyOffDays, d.day].sort());
                            }
                          }}
                          className={cn(
                            "p-3 rounded-2xl border font-bold text-xs transition-all flex items-center justify-between",
                            isSelected 
                              ? "bg-accent-blue/15 border-accent-blue text-accent-blue" 
                              : "bg-bg-tertiary border-border-primary text-text-primary hover:border-accent-blue/30"
                          )}
                        >
                          <span>{d.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-text-muted uppercase tracking-wider block">
                    Recruiter & Candidate Facing Closure Message
                  </label>
                  <textarea
                    rows={3}
                    value={tempWeeklyMessage}
                    onChange={e => setTempWeeklyMessage(e.target.value)}
                    className="w-full p-4 bg-bg-tertiary border border-border-primary rounded-2xl text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-accent-blue/20"
                    placeholder="Message shown when someone attempts booking on weekly off-days"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWeeklySettingsOpen(false)}
                  className="flex-1 py-3.5 bg-bg-tertiary text-text-primary font-bold rounded-2xl text-xs hover:bg-bg-tertiary/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveWeeklySchedule}
                  disabled={isSavingWeeklyConfig}
                  className="flex-1 py-3.5 bg-accent-blue text-white font-bold rounded-2xl text-xs hover:bg-accent-blue/90 shadow-xl shadow-accent-blue/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingWeeklyConfig && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Save Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Holiday Modal */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary w-full max-w-xl rounded-[36px] border border-border-primary shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border-primary">
                <div>
                  <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">
                    {editingClosure ? 'Edit Event' : 'Add New Event'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-0.5">
                    {editingClosure ? 'Manage Office Closure' : 'Declare Office Closure / Override'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsEventModalOpen(false)}
                  className="p-2 hover:bg-bg-tertiary rounded-xl text-text-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-text-muted uppercase tracking-wider block">
                    Event Title *
                  </label>
                  <input
                    required
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Christmas Day, US Memorial Day, Office Maintenance"
                    className="w-full px-4 py-3 bg-bg-tertiary border border-border-primary rounded-xl text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-accent-blue/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-text-muted uppercase tracking-wider block">
                      Event Type
                    </label>
                    <select
                      value={formType}
                      onChange={e => setFormType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-bg-tertiary border border-border-primary rounded-xl text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-accent-blue/20"
                    >
                      <option value="public_holiday">Public Holiday</option>
                      <option value="company_holiday">Company Holiday</option>
                      <option value="special_closure">Special Office Closure</option>
                      <option value="weekly_off">Weekly Off</option>
                      <option value="other">Other Event</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-text-muted uppercase tracking-wider block">
                      Location / Office
                    </label>
                    <select
                      value={formLocation}
                      onChange={e => setFormLocation(e.target.value)}
                      className="w-full px-4 py-3 bg-bg-tertiary border border-border-primary rounded-xl text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-accent-blue/20"
                    >
                      <option value="all">All Offices & Remote</option>
                      <option value="us_office">US Office (EST)</option>
                      <option value="india_office">India Office</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-text-muted uppercase tracking-wider block">
                      Start Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={formStartDate}
                      onChange={e => setFormStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-bg-tertiary border border-border-primary rounded-xl text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-accent-blue/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-text-muted uppercase tracking-wider block">
                      End Date (Inclusive) *
                    </label>
                    <input
                      required
                      type="date"
                      value={formEndDate}
                      onChange={e => setFormEndDate(e.target.value)}
                      min={formStartDate}
                      className="w-full px-4 py-3 bg-bg-tertiary border border-border-primary rounded-xl text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-accent-blue/20"
                    />
                  </div>
                </div>

                {/* Calendar Working Status Toggle (Office Closed vs Office Open) */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-muted uppercase tracking-wider block">
                    Calendar Status *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormStatus('closed')}
                      className={cn(
                        "py-3 px-4 rounded-2xl text-xs font-black border flex items-center justify-center gap-2 transition-all",
                        formStatus === 'closed'
                          ? "bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm"
                          : "bg-bg-tertiary text-text-muted border-border-primary hover:text-text-primary"
                      )}
                    >
                      <Lock className="w-4 h-4" />
                      Office Closed
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('open')}
                      className={cn(
                        "py-3 px-4 rounded-2xl text-xs font-black border flex items-center justify-center gap-2 transition-all",
                        formStatus === 'open'
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm"
                          : "bg-bg-tertiary text-text-muted border-border-primary hover:text-text-primary"
                      )}
                    >
                      <Unlock className="w-4 h-4" />
                      Office Open
                    </button>
                  </div>
                  <p className="text-[11px] font-bold text-text-muted">
                    {formStatus === 'closed'
                      ? "Non-working day: All interview bookings are blocked for this date or date range."
                      : "Working day: Normal interview booking availability is restored for this date or date range."}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-text-muted uppercase tracking-wider block">
                    Custom Message for Recruiters & Candidates
                  </label>
                  <textarea
                    rows={2}
                    value={formCustomMessage}
                    onChange={e => setFormCustomMessage(e.target.value)}
                    placeholder="This is a non-working day. Our office is closed for [Holiday]. Please select another date for the interview."
                    className="w-full p-3 bg-bg-tertiary border border-border-primary rounded-xl text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-accent-blue/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-text-muted uppercase tracking-wider block">
                    Internal Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Internal reference details, approvals, or operational instructions"
                    className="w-full p-3 bg-bg-tertiary border border-border-primary rounded-xl text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-accent-blue/20"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3">
                  {editingClosure && (
                    <button
                      type="button"
                      onClick={() => handleClearHolidayDate(editingClosure.start_date, editingClosure)}
                      className="p-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-2xl text-xs border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                      title="Clear this holiday entry and restore default schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear Holiday
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="flex-1 py-3.5 bg-bg-tertiary text-text-primary font-bold rounded-2xl text-xs hover:bg-bg-tertiary/80 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEvent}
                    className="flex-1 py-3.5 bg-accent-blue text-white font-bold rounded-2xl text-xs hover:bg-accent-blue/90 shadow-xl shadow-accent-blue/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingEvent && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {editingClosure ? 'Save Changes' : 'Save Status'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Holidays Confirmation Modal */}
      <AnimatePresence>
        {isClearAllModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[75] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary w-full max-w-md rounded-[36px] border border-rose-500/30 shadow-2xl p-6 sm:p-8 space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                  Clear All Holidays?
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  This will remove all manually added holidays, office closures, and special open days. All corresponding booking restrictions will be removed, and changes will be synchronised with Google Calendar.
                </p>
              </div>

              <div className="p-3.5 bg-bg-tertiary rounded-2xl border border-border-primary text-[11px] text-text-muted space-y-1.5">
                <div className="flex items-center gap-2 text-text-primary font-bold">
                  <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0" />
                  Default Saturday & Sunday weekly offs remain active
                </div>
                <div className="flex items-center gap-2 text-text-primary font-bold">
                  <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0" />
                  Historical interviews and proxy assignments remain safe
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClearAllModalOpen(false)}
                  disabled={isClearingAll}
                  className="flex-1 py-3.5 bg-bg-tertiary text-text-primary font-bold rounded-2xl text-xs hover:bg-bg-tertiary/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAllHolidays}
                  disabled={isClearingAll}
                  className="flex-1 py-3.5 bg-rose-500 text-white font-bold rounded-2xl text-xs hover:bg-rose-600 shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isClearingAll ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit Logs Modal */}
      <AnimatePresence>
        {isAuditLogsOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary w-full max-w-2xl rounded-[36px] border border-border-primary shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border-primary">
                <div>
                  <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">
                    Governance & Tracking
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-0.5">
                    Holiday & Override Audit History
                  </h2>
                </div>
                <button
                  onClick={() => setIsAuditLogsOpen(false)}
                  className="p-2 hover:bg-bg-tertiary rounded-xl text-text-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-xs font-bold text-text-muted text-center py-10">
                    No holiday or override audit logs recorded yet.
                  </p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="p-3.5 bg-bg-tertiary/50 border border-border-primary rounded-2xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary">{log.closure_title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-accent-blue/10 text-accent-blue">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Performed by: <span className="text-text-primary font-bold">{log.actor_name || log.actor_email}</span> at {new Date(log.created_at).toLocaleString()}
                      </p>
                      {log.reason && (
                        <p className="text-[10px] text-text-secondary italic">
                          "{log.reason}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

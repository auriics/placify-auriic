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
  canOverrideWorkingDay 
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
  syncClosuresFromGoogleCalendar
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
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State for Event Modal
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<OfficeClosureEventType>('public_holiday');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCustomMessage, setFormCustomMessage] = useState('');
  const [formLocation, setFormLocation] = useState('all');
  const [formIsOverride, setFormIsOverride] = useState(false);
  const [formIsWorkingDay, setFormIsWorkingDay] = useState(false);
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

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        evaluation: checkDateOfficeClosure(dateStr, closures, weeklyConfig)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
      const m = currentMonth === 11 ? 1 : currentMonth + 2;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
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
    setFormStartDate(defaultDate);
    setFormEndDate(defaultDate);
    setFormStartTime('');
    setFormEndTime('');
    setFormDescription('');
    setFormCustomMessage('');
    setFormLocation('all');
    setFormIsOverride(false);
    setFormIsWorkingDay(false);
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
    setFormStartDate(closure.start_date.split('T')[0]);
    setFormEndDate(closure.end_date ? closure.end_date.split('T')[0] : closure.start_date.split('T')[0]);
    setFormStartTime(closure.start_time || '');
    setFormEndTime(closure.end_time || '');
    setFormDescription(closure.description || '');
    setFormCustomMessage(closure.custom_message || '');
    setFormLocation(closure.location || 'all');
    setFormIsOverride(Boolean(closure.is_override));
    setFormIsWorkingDay(Boolean(closure.is_working_day_override));
    setIsEventModalOpen(true);
  };

  // Quick Override for a Day
  const handleQuickToggleOverride = async (dateStr: string, currentEval: ReturnType<typeof checkDateOfficeClosure>) => {
    if (!canOverride) {
      showToast('Only Higher Authorities and Administrators can override working schedule rules.', 'error');
      return;
    }

    try {
      if (currentEval.closure && currentEval.closure.is_override) {
        // Remove existing override
        await deleteOfficeClosure(
          currentEval.closure.id,
          user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined,
          'Removed schedule override'
        );
        showToast(`Override removed for ${dateStr}. Restored standard schedule.`, 'success');
        return;
      }

      if (currentEval.isClosed) {
        // Closed -> Force OPEN as normal working day
        await createOfficeClosure(
          {
            title: `Working Day Override (${dateStr})`,
            event_type: 'other',
            start_date: dateStr,
            end_date: dateStr,
            description: 'Higher authority override: office open for interview bookings.',
            custom_message: '',
            is_override: true,
            is_working_day_override: true,
            location: 'all'
          },
          user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined,
          'Higher authority opened day for interview bookings'
        );
        showToast(`Date ${dateStr} is now OPEN for interview bookings!`, 'success');
      } else {
        // Open -> Force CLOSED
        await createOfficeClosure(
          {
            title: `Special Office Closure (${dateStr})`,
            event_type: 'special_closure',
            start_date: dateStr,
            end_date: dateStr,
            description: 'Declared additional office closure by management.',
            custom_message: 'Our office is closed today by special management declaration. Please schedule for another working day.',
            is_override: true,
            is_working_day_override: false,
            location: 'all'
          },
          user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined,
          'Higher authority declared special office closure'
        );
        showToast(`Date ${dateStr} is now BLOCKED for interview bookings.`, 'success');
      }
    } catch (err: any) {
      showToast('Failed to apply override: ' + (err.message || 'Error'), 'error');
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
        start_date: formStartDate,
        end_date: effectiveEnd,
        start_time: formStartTime || null,
        end_time: formEndTime || null,
        description: formDescription.trim() || null,
        custom_message: formCustomMessage.trim() || null,
        location: formLocation || 'all',
        is_override: formIsOverride,
        is_working_day_override: formIsOverride ? formIsWorkingDay : false
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

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this office closure? Interview bookings will be reopened for this period if no other rules apply.')) {
      return;
    }

    try {
      const userActor = user ? { id: user.id, display_name: user.display_name || user.email, email: user.email } : undefined;
      await deleteOfficeClosure(id, userActor, 'Deleted office closure');
      showToast('Office closure deleted.', 'success');
      setIsEventModalOpen(false);
    } catch (err: any) {
      showToast('Failed to delete closure: ' + err.message, 'error');
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
      .filter(c => c.is_active !== false && !c.is_working_day_override && (c.end_date || c.start_date) >= todayStr)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 5);
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
            Office Holiday & Weekly Off Calendar
          </h1>
          <p className="text-xs sm:text-sm font-bold text-text-muted">
            Centralised management of office closures, non-working days, and interview booking restrictions.
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

      {/* Recruiter / Candidate Announcements Banner */}
      {upcomingClosures.length > 0 && (
        <div className="p-5 sm:p-6 bg-amber-500/10 border border-amber-500/20 rounded-[28px] flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/30">
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-amber-500 uppercase tracking-wider">
              Upcoming Office Closures (Booking Restrictions Active)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2.5">
              {upcomingClosures.map(c => (
                <div key={c.id} className="p-3 bg-bg-secondary/70 rounded-xl border border-border-primary/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary truncate">{c.title}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md font-bold uppercase">
                      {c.event_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-text-muted">
                    {c.start_date === c.end_date ? c.start_date : `${c.start_date} → ${c.end_date}`}
                  </p>
                  {c.custom_message && (
                    <p className="text-[10px] text-text-secondary italic line-clamp-1">
                      "{c.custom_message}"
                    </p>
                  )}
                </div>
              ))}
            </div>
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
            <span>Working Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-rose-500/20 border border-rose-500/40" />
            <span>Public / Company Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-amber-500/20 border border-amber-500/40" />
            <span>Weekly Off (Office Closed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-500/30 border border-emerald-500" />
            <span>Higher Authority Override</span>
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
            const isOverrideWorking = evalRes.reason === 'override_working';
            const isOverrideClosure = evalRes.reason === 'override_closure';
            const isWeeklyOff = evalRes.reason === 'weekly_off';
            const isHoliday = evalRes.reason === 'holiday';

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[110px] sm:min-h-[135px] p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col justify-between group relative overflow-hidden",
                  !item.isCurrentMonth && "opacity-35 bg-bg-tertiary/20",
                  item.isCurrentMonth && "bg-bg-tertiary/40 hover:border-accent-blue/40",
                  isToday && "ring-2 ring-accent-blue/40 border-accent-blue",
                  isOverrideWorking && "border-emerald-500/50 bg-emerald-500/10",
                  isOverrideClosure && "border-rose-500/50 bg-rose-500/10",
                  isHoliday && "border-rose-500/40 bg-rose-500/5",
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
                          onClick={() => handleQuickToggleOverride(item.dateStr, evalRes)}
                          className={cn(
                            "p-1 rounded-md text-[10px] font-bold transition-colors",
                            isClosed ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                          )}
                          title={isClosed ? "Make Working Day" : "Declare Closure"}
                        >
                          {isClosed ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
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
                        title={evalRes.closure ? "Edit Closure Event" : "Add Closure Event"}
                      >
                        {evalRes.closure ? <Edit3 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Day status badge & labels */}
                <div className="mt-1.5 flex-1 flex flex-col justify-end gap-1">
                  {isOverrideWorking && (
                    <div className="p-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-[9px] sm:text-[10px] font-black text-emerald-300 leading-tight">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">OVERRIDE: OPEN</span>
                      </div>
                      <span className="text-[8px] font-normal block opacity-80">Bookings permitted</span>
                    </div>
                  )}

                  {isOverrideClosure && (
                    <div className="p-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-[9px] sm:text-[10px] font-black text-rose-300 leading-tight">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{evalRes.title || 'SPECIAL CLOSURE'}</span>
                      </div>
                      <span className="text-[8px] font-normal block opacity-80">Office closed</span>
                    </div>
                  )}

                  {isHoliday && !isOverrideClosure && (
                    <div 
                      onClick={() => evalRes.closure && isManager && handleOpenEditModal(evalRes.closure)}
                      className="p-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[9px] sm:text-[10px] font-black text-rose-300 leading-tight cursor-pointer hover:bg-rose-500/25 transition-all"
                    >
                      <div className="flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 shrink-0" />
                        <span className="truncate">{evalRes.title || 'HOLIDAY'}</span>
                      </div>
                      <span className="text-[8px] font-normal block opacity-80">Office Closed</span>
                    </div>
                  )}

                  {isWeeklyOff && !isHoliday && !isOverrideClosure && (
                    <div className="p-1.5 rounded-xl bg-bg-secondary/70 border border-border-primary text-[9px] sm:text-[10px] font-black text-text-muted leading-tight">
                      <span className="truncate block">WEEKLY OFF</span>
                      <span className="text-[8px] font-normal block opacity-70">Office closed</span>
                    </div>
                  )}

                  {!isClosed && !isOverrideWorking && (
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

                {/* Higher Authority Overrides */}
                {canOverride && (
                  <div className="p-4 bg-bg-tertiary/60 border border-border-primary rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-text-primary block">
                          Higher Authority Date Override
                        </span>
                        <p className="text-[11px] text-text-muted">
                          Explicitly override standard weekly off or holiday rules for this date range.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formIsOverride}
                        onChange={e => setFormIsOverride(e.target.checked)}
                        className="w-5 h-5 rounded text-accent-blue"
                      />
                    </div>

                    {formIsOverride && (
                      <div className="pt-2 border-t border-border-primary flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setFormIsWorkingDay(true)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                            formIsWorkingDay ? "bg-emerald-500/20 text-emerald-300 border-emerald-500" : "bg-bg-secondary text-text-muted border-border-primary"
                          )}
                        >
                          Force Open as Working Day
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormIsWorkingDay(false)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                            !formIsWorkingDay ? "bg-rose-500/20 text-rose-300 border-rose-500" : "bg-bg-secondary text-text-muted border-border-primary"
                          )}
                        >
                          Force Office Closure
                        </button>
                      </div>
                    )}
                  </div>
                )}

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
                      onClick={() => handleDeleteEvent(editingClosure.id)}
                      className="p-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-2xl text-xs border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
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
                    {editingClosure ? 'Save Changes' : 'Create Closure'}
                  </button>
                </div>
              </form>
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

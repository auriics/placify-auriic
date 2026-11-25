import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ShieldAlert, Calendar } from 'lucide-react';
import { User, OfficeClosure, isAurrumRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { shouldHideProxyLeaveFromRole, getActiveOrFutureProxyLeaves, isProxyUser } from '../services/interviewService';
import { isDateOfficeClosedSync, subscribeToOfficeClosures } from '../services/holidayService';
import { cn, getEasternDate } from '../lib/utils';

interface ProxyLeaveBannerProps {
  team: User[];
  className?: string;
  contextTitle?: string;
  brand?: 'auriic' | 'aurrum' | 'all';
}

export const ProxyLeaveBanner: React.FC<ProxyLeaveBannerProps> = ({
  team,
  className,
  contextTitle,
  brand = 'all'
}) => {
  const { user } = useAuth();
  const [closures, setClosures] = useState<OfficeClosure[]>([]);

  useEffect(() => {
    const unsub = subscribeToOfficeClosures(setClosures);
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 1. Role-based visibility check (Aurrum roles see Aurrum notices; candidates & unauthorized sales are hidden)
  if (shouldHideProxyLeaveFromRole(user?.role, brand)) {
    return null;
  }

  // 2. Evaluate today's Office Closure / Holiday status
  const todayStr = getEasternDate();
  const closureInfo = isDateOfficeClosedSync(todayStr);

  // 3. Relevant team members and active leaves
  const relevantTeam = useMemo(() => {
    if (!Array.isArray(team)) return [];
    if (brand === 'aurrum') {
      return team.filter(u => isAurrumRole(u?.role) || u?.crm_brand === 'aurrum' || isProxyUser(u));
    }
    if (brand === 'auriic') {
      return team.filter(u => isProxyUser(u) && u?.crm_brand !== 'aurrum');
    }
    return team;
  }, [team, brand]);

  const allProxies = useMemo(
    () => (relevantTeam || []).filter(u => isProxyUser(u) || isAurrumRole(u?.role)),
    [relevantTeam]
  );
  const activeLeaves = useMemo(
    () => getActiveOrFutureProxyLeaves(relevantTeam || []),
    [relevantTeam]
  );

  // If no office closure and no active leaves, do not display anything
  if (!closureInfo.isClosed && activeLeaves.length === 0) {
    return null;
  }

  const allProxiesHaveLeave = allProxies.length > 0 && activeLeaves.length >= allProxies.length;
  const isAurrum = brand === 'aurrum';

  return (
    <div className={cn("space-y-4 font-sans", className)}>
      {/* 1. Office Holiday / Closure Announcement Banner */}
      {closureInfo.isClosed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 border-2 border-rose-500/35 bg-rose-500/15 text-rose-400 shadow-xl shadow-rose-500/5 relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Calendar className="w-6 h-6 text-rose-400" />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md bg-rose-500 text-white inline-flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    OFFICE CLOSED
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    NON-WORKING DAY
                  </span>
                  {contextTitle && (
                    <span className="text-xs font-bold text-text-muted">• {contextTitle}</span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-black text-rose-400 tracking-tight leading-snug uppercase">
                  OFFICE CLOSED – {closureInfo.title || 'SCHEDULED DAY OFF'}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-rose-300/90 leading-relaxed">
                  {closureInfo.message}
                </p>
                <p className="text-[11px] text-text-secondary">
                  Notice: Interview bookings and conducting are restricted on this date.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Team / Proxy Leave Notice Banner */}
      {activeLeaves.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-2xl sm:rounded-3xl p-5 sm:p-6 border shadow-xl relative overflow-hidden transition-all",
            allProxiesHaveLeave
              ? "bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/5"
              : "bg-rose-500/10 border-rose-500/25 text-rose-300 shadow-rose-500/5"
          )}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                {allProxiesHaveLeave ? (
                  <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                )}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md bg-rose-500 text-white inline-flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    ON LEAVE
                  </span>
                  {contextTitle && (
                    <span className="text-xs font-bold text-text-muted">• {contextTitle}</span>
                  )}
                </div>

                {allProxiesHaveLeave ? (
                  <p className="text-sm sm:text-base font-black text-rose-400 tracking-tight leading-snug">
                    {isAurrum
                      ? "ALL AURRUM PROXY TEAM MEMBERS HAVE LEAVE SCHEDULED. PLEASE CHECK AVAILABILITY BEFORE SCHEDULING INTERVIEWS."
                      : "ALL PROXY TEAM MEMBERS HAVE LEAVE SCHEDULED. PLEASE CHECK AVAILABILITY BEFORE SCHEDULING INTERVIEWS."}
                  </p>
                ) : (
                  <p className="text-sm sm:text-base font-black text-text-primary tracking-tight leading-snug">
                    {isAurrum
                      ? "Aurrum Team Leave Notice — Active / Scheduled Leave"
                      : "Proxy Team Leave Notice — Active / Scheduled Leave"}
                  </p>
                )}

                {/* List of proxies with leave */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {activeLeaves.map((item) => (
                    <div
                      key={item.proxyId}
                      className="bg-bg-secondary/90 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-black text-text-primary truncate">{item.proxyName}</span>
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-rose-500 text-white rounded-md inline-flex items-center gap-1 shrink-0">
                          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                          ON LEAVE
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-rose-400 shrink-0">
                        {item.leavePeriodText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

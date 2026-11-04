import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { shouldHideProxyLeaveFromRole, getActiveOrFutureProxyLeaves, isProxyUser } from '../services/interviewService';
import { cn } from '../lib/utils';

interface ProxyLeaveBannerProps {
  team: User[];
  className?: string;
  contextTitle?: string;
}

export const ProxyLeaveBanner: React.FC<ProxyLeaveBannerProps> = ({ team, className, contextTitle }) => {
  const { user } = useAuth();

  // 1. Never show proxy leave status to lead and sales team (or candidates)
  if (shouldHideProxyLeaveFromRole(user?.role)) {
    return null;
  }

  const allProxies = useMemo(() => (team || []).filter(isProxyUser), [team]);
  const activeLeaves = useMemo(() => getActiveOrFutureProxyLeaves(team || []), [team]);

  // If no proxy has leave booked, do not display the alert
  if (activeLeaves.length === 0) {
    return null;
  }

  const allProxiesHaveLeave = allProxies.length > 0 && activeLeaves.length >= allProxies.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl sm:rounded-3xl p-5 sm:p-6 border shadow-xl relative overflow-hidden font-sans transition-all",
        allProxiesHaveLeave
          ? "bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/5"
          : "bg-rose-500/10 border-rose-500/25 text-rose-300 shadow-rose-500/5",
        className
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
                ALL PROXY TEAM MEMBERS HAVE LEAVE SCHEDULED. PLEASE CHECK AVAILABILITY BEFORE SCHEDULING INTERVIEWS.
              </p>
            ) : (
              <p className="text-sm sm:text-base font-black text-text-primary tracking-tight leading-snug">
                Proxy Team Leave Notice — Active / Scheduled Leave
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
  );
};

import { isPaymentsRevenueDisabled, isAurrumRestrictedForUser } from './lib/featureFlags';
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { isProxyUser } from './services/interviewService';
import { canViewHolidayCalendar } from './lib/permissions';
import { isAurrumRole } from './types';
import { AddCandidateModal } from './components/AddCandidateModal';
import { NotificationList } from './components/NotificationList';
import { SLAMonitor } from './components/SLAMonitor';
import { MigrationExecutor } from './MigrationExecutor';
import { migrateAllChecklists, testConnection, autoAssignFaizToCandidates } from './services/storage';
import { Plus, Menu, Search } from 'lucide-react';
import { MobileBottomNav } from './components/MobileBottomNav';
import { GlobalSearchModal } from './components/GlobalSearchModal';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const CandidateDashboard = lazy(() => import('./pages/CandidateDashboard').then(m => ({ default: m.CandidateDashboard })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Pipeline = lazy(() => import('./pages/Pipeline').then(m => ({ default: m.Pipeline })));
const Candidates = lazy(() => import('./pages/Candidates').then(m => ({ default: m.Candidates })));
const CandidateDetail = lazy(() => import('./pages/CandidateDetail').then(m => ({ default: m.CandidateDetail })));
const FollowUps = lazy(() => import('./pages/FollowUps').then(m => ({ default: m.FollowUps })));
const NotInterested = lazy(() => import('./pages/NotInterested').then(m => ({ default: m.NotInterested })));
const NotEligible = lazy(() => import('./pages/NotEligible').then(m => ({ default: m.NotEligible })));
const Team = lazy(() => import('./pages/Team').then(m => ({ default: m.Team })));
const Receipt = lazy(() => import('./pages/Receipt').then(m => ({ default: m.Receipt })));
const AppTracker = lazy(() => import('./pages/AppTracker').then(m => ({ default: m.AppTracker })));
const ResumeLogBook = lazy(() => import('./pages/ResumeLogBook').then(m => ({ default: m.ResumeLogBook })));
const RTRLogBook = lazy(() => import('./pages/RTRLogBook').then(m => ({ default: m.RTRLogBook })));
const ResumePrepLog = lazy(() => import('./pages/ResumePrepLog').then(m => ({ default: m.ResumePrepLog })));
const TargetDashboard = lazy(() => import('./pages/TargetDashboard').then(m => ({ default: m.TargetDashboard })));
const CVRepository = lazy(() => import('./pages/CVRepository').then(m => ({ default: m.CVRepository })));
const DomainResumeRepository = lazy(() => import('./pages/DomainResumeRepository').then(m => ({ default: m.DomainResumeRepository })));
const FeatureAnnouncements = lazy(() => import('./pages/FeatureAnnouncements').then(m => ({ default: m.FeatureAnnouncements })));
const InterviewSupportDashboard = lazy(() => import('./pages/InterviewSupport/Dashboard').then(m => ({ default: m.InterviewSupportDashboard })));
const ProxyDashboard = lazy(() => import('./pages/InterviewSupport/ProxyDashboard').then(m => ({ default: m.ProxyDashboard })));
const BookingPage = lazy(() => import('./pages/InterviewSupport/BookingPage').then(m => ({ default: m.BookingPage })));
const CRMDashboard = lazy(() => import('./pages/CRMDashboard').then(m => ({ default: m.CRMDashboard })));
const AurrumDashboard = lazy(() => import('./pages/AurrumCareers/AurrumDashboard').then(m => ({ default: m.AurrumDashboard })));
const AurrumCandidates = lazy(() => import('./pages/AurrumCareers/AurrumCandidates').then(m => ({ default: m.AurrumCandidates })));
const AurrumCandidateDetail = lazy(() => import('./pages/AurrumCareers/AurrumCandidateDetail').then(m => ({ default: m.AurrumCandidateDetail })));
const AurrumSales = lazy(() => import('./pages/AurrumCareers/AurrumSales').then(m => ({ default: m.AurrumSales })));
const AurrumInterviewSupport = lazy(() => import('./pages/AurrumCareers/AurrumInterviewSupport').then(m => ({ default: m.AurrumInterviewSupport })));
const AurrumTeam = lazy(() => import('./pages/AurrumCareers/AurrumTeam').then(m => ({ default: m.AurrumTeam })));
const HolidayCalendar = lazy(() => import('./pages/HolidayCalendar').then(m => ({ default: m.HolidayCalendar })));

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center p-20">
    <div className="w-10 h-10 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
  </div>
);

const AppContent: React.FC = () => {
  const { user, isLoading, isAuthReady } = useAuth();
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global search shortcut (Ctrl+K, Cmd+K, or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  useEffect(() => {
    if (isAuthReady) {
      testConnection();
    }
  }, [isAuthReady]);

  // Preload the most-visited page bundles in the browser's idle time so that
  // switching menus doesn't trigger a network fetch for the JS chunk.
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const idle = (typeof window !== 'undefined' && 'requestIdleCallback' in window)
      ? (window as any).requestIdleCallback
      : (fn: () => void) => setTimeout(fn, 200);
    idle(() => {
      // These are the highest-traffic pages; preload their lazy bundles
      import('./pages/Candidates');
      import('./pages/Pipeline');
      import('./pages/AppTracker');
      import('./pages/FollowUps');
      import('./pages/Dashboard');
    });
  }, [isAuthReady, user]);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#dashboard');
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (isAuthReady && user) {
      if (isAurrumRestrictedForUser(user)) {
        const current = window.location.hash.split('?')[0];
        if (current.startsWith('#aurrum-')) {
          window.location.hash = '#dashboard';
        }
      } else if (user.role === 'candidate' && user.candidate_id) {
        const targetHash = `#candidate?id=${user.candidate_id}`;
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        }
      } else if (isAurrumRole(user.role)) {
        const current = window.location.hash.split('?')[0];
        const allowedForAurrum = [
          '#aurrum-dashboard',
          '#aurrum-candidates',
          '#aurrum-candidate',
          '#aurrum-sales',
          '#aurrum-interviews',
          '#receipt',
          ...(canViewHolidayCalendar(user) ? ['#office-holidays', '#holidays'] : []),
          ...(user.role === 'aurrum_admin' ? ['#aurrum-team'] : []),
        ];
        if (!current || (!allowedForAurrum.includes(current) && !current.startsWith('#book-interview'))) {
          window.location.hash = '#aurrum-dashboard';
        }
      }
      
      // Only run maintenance tasks for administrators, once per session during browser idle time
      if ((user.role === 'administrator' || user.role === 'jpc_sysadmin') && !sessionStorage.getItem('admin_maintenance_done')) {
        sessionStorage.setItem('admin_maintenance_done', 'true');
        const scheduleIdle = (typeof window !== 'undefined' && 'requestIdleCallback' in window)
          ? (window as any).requestIdleCallback
          : (fn: () => void) => setTimeout(fn, 2000);
        scheduleIdle(() => {
          migrateAllChecklists().catch(console.error);
          autoAssignFaizToCandidates().catch(console.error);
        });
      }
    }
  }, [isAuthReady, user]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-xs text-text-secondary font-medium animate-pulse">Loading application...</p>
        </div>
      </div>
    );
  }


  const isBookingPage = currentHash.startsWith('#book-interview');
  const isAurrumRoute = !isAurrumRestrictedForUser(user) && (currentHash.startsWith('#aurrum-') || isAurrumRole(user?.role));

  if (!user && !isBookingPage) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    );
  }

  const renderPage = () => {
    const hash = currentHash.split('?')[0];
    
    if (user?.role === 'candidate' || user?.role === 'jpc_candidate') {
      switch (hash) {
        case '#dashboard': return <CandidateDashboard />;
        case '#candidate': return <CandidateDetail />;
        case '#receipt':
          if (isPaymentsRevenueDisabled()) return <CandidateDashboard />;
          return <Receipt />;
        default: return <CandidateDashboard />;
      }
    }

    if (isAurrumRole(user?.role)) {
      switch (hash) {
        case '#aurrum-dashboard': return <AurrumDashboard />;
        case '#aurrum-candidates': return <AurrumCandidates />;
        case '#aurrum-candidate': return <AurrumCandidateDetail />;
        case '#aurrum-sales': return <AurrumSales />;
        case '#aurrum-interviews': return <AurrumInterviewSupport />;
        case '#aurrum-team':
          if (user?.role === 'aurrum_admin') return <AurrumTeam />;
          return <AurrumDashboard />;
        case '#receipt': 
          if (isPaymentsRevenueDisabled()) return <AurrumDashboard />;
          return <Receipt />;
        case '#office-holidays':
        case '#holidays':
          if (!canViewHolidayCalendar(user)) {
            window.location.hash = '#aurrum-dashboard';
            return <AurrumDashboard />;
          }
          return <HolidayCalendar />;
        default:
          if (hash.startsWith('#book-interview')) {
            return <BookingPage />;
          }
          return <AurrumDashboard />;
      }
    }

    switch (hash) {
      case '#dashboard': 
        return <Dashboard />;
      case '#crm-dashboard':
        if (isPaymentsRevenueDisabled()) return <Dashboard />;
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs') return <Dashboard />;
        return <CRMDashboard />;
      case '#pipeline': 
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_recruiter' && user?.role !== 'jpc_marketing' && user?.role !== 'jpc_marketing_support' && user?.role !== 'jpc_sales' && user?.role !== 'jpc_resume') return <Dashboard />;
        return <Pipeline />;
      case '#candidates': 
        return <Candidates />;
      case '#candidate': return <CandidateDetail />;
      case '#followups': 
        return <FollowUps />;
      case '#not-interested': 
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_lead_gen' && user?.role !== 'jpc_sales') return <Dashboard />;
        return <NotInterested />;
      case '#not-eligible': 
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_lead_gen' && user?.role !== 'jpc_sales') return <Dashboard />;
        return <NotEligible />;
      case '#team': 
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_marketing' && user?.role !== 'jpc_cs') return <Dashboard />;
        return <Team />;
      case '#receipt': 
        if (isPaymentsRevenueDisabled()) return <Dashboard />;
        return <Receipt />;
      case '#applications': 
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_compliance_person' && user?.role !== 'jpc_recruiter' && user?.role !== 'jpc_marketing') return <Dashboard />;
        return <AppTracker />;
      case '#resume-log': 
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_compliance_person' && user?.role !== 'jpc_recruiter' && user?.role !== 'jpc_resume' && user?.role !== 'jpc_marketing' && !isProxyUser(user)) return <Dashboard />;
        return <ResumeLogBook />;
      case '#resume-prep-log': 
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_compliance_person' && user?.role !== 'jpc_recruiter' && user?.role !== 'jpc_resume' && user?.role !== 'jpc_marketing' && !isProxyUser(user)) return <ResumePrepLog />;
      case '#rtr-log': 
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_compliance_person' && user?.role !== 'jpc_recruiter' && user?.role !== 'jpc_resume' && user?.role !== 'jpc_marketing' && !isProxyUser(user)) return <Dashboard />;
        return <RTRLogBook />;
      case '#target-dashboard':
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_compliance_person') return <Dashboard />;
        return <TargetDashboard />;
      case '#cv-repository':
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_compliance_person' && user?.role !== 'jpc_resume' && user?.role !== 'jpc_marketing' && !isProxyUser(user)) return <Dashboard />;
        return <CVRepository />;
      case '#domain-resumes':
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_compliance_person' && user?.role !== 'jpc_recruiter' && user?.role !== 'jpc_resume' && user?.role !== 'jpc_marketing' && !isProxyUser(user)) return <Dashboard />;
        return <DomainResumeRepository />;
      case '#feature-alerts':
        return <FeatureAnnouncements />;
      case '#interviews': 
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_compliance_person' && user?.role !== 'jpc_recruiter' && !isProxyUser(user) && user?.role !== 'jpc_marketing') return <Dashboard />;
        return <InterviewSupportDashboard />;
      case '#interviews-proxy':
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'jpc_cs' && user?.role !== 'jpc_compliance_person' && !isProxyUser(user)) return <Dashboard />;
        return <ProxyDashboard />;
      case '#aurrum-dashboard':
        if (isAurrumRestrictedForUser(user)) return <Dashboard />;
        return <AurrumDashboard />;
      case '#aurrum-candidates':
        if (isAurrumRestrictedForUser(user)) return <Dashboard />;
        return <AurrumCandidates />;
      case '#aurrum-candidate':
        if (isAurrumRestrictedForUser(user)) return <Dashboard />;
        return <AurrumCandidateDetail />;
      case '#aurrum-sales':
        if (isAurrumRestrictedForUser(user)) return <Dashboard />;
        return <AurrumSales />;
      case '#aurrum-interviews':
        if (isAurrumRestrictedForUser(user)) return <Dashboard />;
        return <AurrumInterviewSupport />;
      case '#aurrum-team':
        if (isAurrumRestrictedForUser(user)) return <Dashboard />;
        if (user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager' && user?.role !== 'aurrum_admin') return <AurrumDashboard />;
        return <AurrumTeam />;
      case '#office-holidays':
      case '#holidays':
        if (!canViewHolidayCalendar(user)) {
          window.location.hash = '#dashboard';
          return <Dashboard />;
        }
        return <HolidayCalendar />;
      default:
        if (hash.startsWith('#book-interview')) {
          return <BookingPage />;
        }
        return <Dashboard />;
    }
  };

  const getMobileTitle = (hash: string) => {
    const base = hash.split('?')[0];
    switch (base) {
      case '#dashboard': return 'Dashboard';
      case '#crm-dashboard': return 'CRM Leads & Sales';
      case '#pipeline': return 'Pipeline Board';
      case '#candidates': return 'Candidates';
      case '#candidate': return 'Candidate Profile';
      case '#followups': return 'Follow-Ups';
      case '#applications': return 'App Tracker';
      case '#resume-log': return 'Resume Log';
      case '#resume-prep-log': return 'Resume Prep';
      case '#rtr-log': return 'RTR Log';
      case '#target-dashboard': return 'Target Compliance';
      case '#cv-repository': return 'CV Repository';
      case '#domain-resumes': return 'Domain Resumes';
      case '#feature-alerts': return 'Feature Alerts';
      case '#interviews': return 'Interview Support';
      case '#interviews-proxy': return 'Proxy Support';
      case '#office-holidays':
      case '#holidays': return 'Office Holidays';
      case '#aurrum-dashboard': return 'Aurrum Dashboard';
      case '#aurrum-candidates': return 'Aurrum Candidates';
      case '#aurrum-candidate': return 'Aurrum Candidate Profile';
      case '#aurrum-sales': return 'Aurrum Sales';
      case '#aurrum-interviews': return 'Aurrum Interview Support';
      case '#aurrum-team': return 'Aurrum Team';
      case '#not-interested': return 'Not Interested';
      case '#not-eligible': return 'Not Eligible';
      case '#team': return 'Team';
      default: return 'Auriic CRM';
    }
  };

  const isReceiptPage = !isPaymentsRevenueDisabled() && currentHash.startsWith('#receipt');
  // isBookingPage is already declared above

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {!isReceiptPage && !isBookingPage && (
        <Sidebar 
          currentHash={currentHash} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
        />
      )}
      
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${(!isReceiptPage && !isBookingPage) ? 'md:ml-[260px]' : ''}`}>
        {!isReceiptPage && !isBookingPage && (
          <header className="h-14 md:h-16 border-b border-border-primary bg-bg-secondary/90 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button 
                className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors shrink-0"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Page Title & Breadcrumb */}
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-sm md:text-base font-semibold text-text-primary tracking-tight truncate">
                  {getMobileTitle(currentHash)}
                </h1>
                <div className="hidden md:flex items-center text-[11px] text-text-muted font-medium tracking-wide">
                  <span>{isAurrumRoute ? 'Aurrum' : 'Placify'}</span>
                  <span className="mx-1.5 opacity-50">/</span>
                  <span className="truncate">{getMobileTitle(currentHash)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
              {/* Global Search Trigger */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary/60 border border-border-primary rounded-xl text-xs text-text-muted font-medium hover:border-accent-blue/50 hover:bg-bg-tertiary transition-all mr-1 shadow-sm cursor-pointer"
                title="Search all CRM modules (⌘K or Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-accent-blue" />
                <span className="hidden md:inline">Search CRM records...</span>
                <span className="md:hidden">Search...</span>
                <kbd className="ml-1 px-1.5 py-0.5 rounded bg-bg-secondary border border-border-primary text-[10px] font-mono text-text-muted">⌘K</kbd>
              </button>

              <button
                onClick={() => setIsSearchOpen(true)}
                className="sm:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl transition-all cursor-pointer"
                aria-label="Open Global Search"
              >
                <Search className="w-4 h-4 text-accent-blue" />
              </button>

              <NotificationList />
              
              {user?.role !== 'candidate' && !isAurrumRoute && (
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:py-2 bg-accent-blue text-white font-medium rounded-md hover:bg-accent-blue/90 transition-colors shadow-sm text-xs md:text-sm"
                  aria-label="Add Candidate"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Candidate</span>
                </button>
              )}
            </div>
          </header>
        )}

        <div className={`p-3 sm:p-6 md:p-10 pb-24 md:pb-10 max-w-7xl mx-auto w-full flex-1 min-w-0 overflow-x-hidden ${isReceiptPage ? 'p-0 md:p-0 max-w-none pb-0 md:pb-0' : ''}`}>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              {renderPage()}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {!isReceiptPage && !isBookingPage && (
        <MobileBottomNav 
          currentHash={currentHash} 
          onOpenMenu={() => setIsSidebarOpen(true)} 
          user={user} 
        />
      )}

      <SLAMonitor />
      <MigrationExecutor />
      <AddCandidateModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }}
      />
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        user={user}
        isAurrumRoute={isAurrumRoute}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
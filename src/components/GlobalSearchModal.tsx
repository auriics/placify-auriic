import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  User, 
  Briefcase, 
  Video, 
  FileText, 
  Clock, 
  Shield, 
  ArrowRight, 
  ExternalLink,
  Command,
  Sparkles,
  Phone,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useDebounce } from '../lib/hooks';
import { subscribeToCollection } from '../services/storage';
import { 
  Candidate, 
  User as UserType, 
  Application, 
  InterviewSupportRequest, 
  ResumeChangeRequest, 
  FollowUp 
} from '../types';
import { 
  SearchCategory, 
  GlobalSearchResultItem, 
  performGlobalSearch 
} from '../lib/searchUtils';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  allUsers?: UserType[];
  isAurrumRoute?: boolean;
}

const CATEGORY_TABS: { key: SearchCategory; label: string; icon: any }[] = [
  { key: 'all', label: 'All', icon: Sparkles },
  { key: 'candidates', label: 'Candidates', icon: User },
  { key: 'applications', label: 'App Tracker', icon: Briefcase },
  { key: 'interviews', label: 'Interviews', icon: Video },
  { key: 'logbooks', label: 'Logbooks', icon: FileText },
  { key: 'followups', label: 'Follow-ups', icon: Clock },
  { key: 'team', label: 'Team', icon: Shield },
];

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  user,
  allUsers = [],
  isAurrumRoute = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Subscribed collections from shared cache
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<InterviewSupportRequest[]>([]);
  const [logbooks, setLogbooks] = useState<ResumeChangeRequest[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserType[]>(allUsers);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchTerm, 150);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setSearchTerm('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  // Subscribe to collections while modal is open (re-uses existing shared listeners)
  useEffect(() => {
    if (!isOpen) return;

    const unsubCandidates = subscribeToCollection<Candidate>('jpc_candidates', setCandidates);
    const unsubApplications = subscribeToCollection<Application>('jpc_applications', setApplications);
    const unsubInterviews = subscribeToCollection<InterviewSupportRequest>('jpc_interview_requests', setInterviews);
    const unsubLogbooks = subscribeToCollection<ResumeChangeRequest>('jpc_resume_requests', setLogbooks);
    const unsubFollowups = subscribeToCollection<FollowUp>('jpc_followups', setFollowups);
    const unsubTeam = subscribeToCollection<UserType>('jpc_users', setTeamMembers);

    return () => {
      unsubCandidates();
      unsubApplications();
      unsubInterviews();
      unsubLogbooks();
      unsubFollowups();
      unsubTeam();
    };
  }, [isOpen]);

  // Execute unified search
  const { results, counts } = useMemo(() => {
    return performGlobalSearch({
      query: debouncedSearch,
      category: activeCategory,
      user,
      allUsers: teamMembers.length > 0 ? teamMembers : allUsers,
      isAurrumRoute,
      candidates,
      applications,
      interviews,
      logbooks,
      followups,
      team: teamMembers
    });
  }, [
    debouncedSearch,
    activeCategory,
    user,
    allUsers,
    teamMembers,
    isAurrumRoute,
    candidates,
    applications,
    interviews,
    logbooks,
    followups
  ]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelectResult = (item: GlobalSearchResultItem) => {
    if (item.url) {
      window.location.hash = item.url;
      onClose();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          e.preventDefault();
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'User': return <User className="w-4 h-4 text-accent-blue" />;
      case 'Briefcase': return <Briefcase className="w-4 h-4 text-accent-green" />;
      case 'Video': return <Video className="w-4 h-4 text-accent-purple" />;
      case 'FileText': return <FileText className="w-4 h-4 text-accent-amber" />;
      case 'Clock': return <Clock className="w-4 h-4 text-accent-teal" />;
      case 'Shield': return <Shield className="w-4 h-4 text-text-muted" />;
      default: return <Search className="w-4 h-4 text-accent-blue" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-10 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
        aria-hidden="true" 
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="relative bg-bg-secondary border border-border-primary rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] z-10 my-auto"
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-border-primary flex items-center gap-3 bg-bg-primary/50">
          <Search className="w-5 h-5 text-accent-blue shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidates, phone, email, applications, interviews, logbooks..."
            className="flex-1 bg-transparent text-text-primary text-sm sm:text-base outline-none placeholder:text-text-muted"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-text-primary transition-colors"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-tertiary rounded-xl text-text-muted hover:text-text-primary transition-colors ml-1"
            title="Close (Esc)"
          >
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-primary text-[10px] font-mono">ESC</span>
            <X className="w-5 h-5 sm:hidden" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2 border-b border-border-primary bg-bg-secondary flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {CATEGORY_TABS.map((tab) => {
            const count = counts[tab.key] || 0;
            const Icon = tab.icon;
            const isActive = activeCategory === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer",
                  isActive
                    ? "bg-accent-blue text-white shadow-sm"
                    : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {searchTerm.trim() && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5",
                    isActive ? "bg-white/20 text-white" : "bg-bg-tertiary text-text-muted"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar">
          {debouncedSearch.trim() === '' ? (
            <div className="p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 text-accent-blue mx-auto flex items-center justify-center">
                <Command className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">CRM-Wide Global Search</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Type any candidate name, phone number, WhatsApp number, email, candidate ID, company name, recruiter or team member to search across all Placify modules.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="text-[11px] font-mono px-2 py-1 bg-bg-tertiary border border-border-primary rounded-lg text-text-secondary">
                  Flexible Phone Matching (+1 555-019-2834 or 5550192834)
                </span>
                <span className="text-[11px] font-mono px-2 py-1 bg-bg-tertiary border border-border-primary rounded-lg text-text-secondary">
                  Partial & Full Name Search
                </span>
                <span className="text-[11px] font-mono px-2 py-1 bg-bg-tertiary border border-border-primary rounded-lg text-text-secondary">
                  App Tracker Links
                </span>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 sm:p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-bg-tertiary text-text-muted mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-text-primary">No results found</h4>
              <p className="text-xs text-text-muted">
                No matching records found for "{debouncedSearch}" in {activeCategory === 'all' ? 'any authorized module' : activeCategory}.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {results.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={`${item.category}-${item.id}`}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                      isSelected
                        ? "bg-accent-blue/10 border-accent-blue/40 shadow-sm"
                        : "bg-bg-tertiary/40 border-border-primary/50 hover:bg-bg-tertiary hover:border-border-primary"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center shrink-0 shadow-sm">
                        {renderIcon(item.icon)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                            {item.title}
                          </h4>
                          {item.badge && (
                            <span 
                              className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-white"
                              style={{ backgroundColor: item.badgeColor || '#3B82F6' }}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.secondaryBadge && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-bg-secondary border border-border-primary text-text-secondary">
                              {item.secondaryBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {item.subtitle}
                        </p>
                        {item.details && (
                          <p className="text-[10px] text-text-muted truncate mt-0.5 font-mono">
                            {item.details}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <ArrowRight className={cn(
                        "w-4 h-4 transition-transform",
                        isSelected ? "text-accent-blue translate-x-1" : "text-text-muted"
                      )} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 border-t border-border-primary bg-bg-secondary/80 flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-bg-tertiary px-1 py-0.5 rounded border border-border-primary">↑↓</kbd> to navigate</span>
            <span><kbd className="font-mono bg-bg-tertiary px-1 py-0.5 rounded border border-border-primary">↵</kbd> to select</span>
            <span><kbd className="font-mono bg-bg-tertiary px-1 py-0.5 rounded border border-border-primary">ESC</kbd> to dismiss</span>
          </div>
          {results.length > 0 && (
            <span className="font-medium">
              Showing {results.length} match{results.length === 1 ? '' : 'es'}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

import { 
  Candidate, 
  User, 
  Application, 
  InterviewSupportRequest, 
  ResumeChangeRequest, 
  FollowUp,
  Stage,
  isAurrumRole
} from '../types';
import { canUserAccessCandidate, matchesProfileHandlingAccess } from './permissions';
import { STAGES } from '../constants';
import { isAurrumRestrictedForUser } from './featureFlags';

export type SearchCategory = 'all' | 'candidates' | 'applications' | 'interviews' | 'logbooks' | 'followups' | 'team';

export interface GlobalSearchResultItem {
  id: string;
  category: 'candidates' | 'applications' | 'interviews' | 'logbooks' | 'followups' | 'team';
  title: string;
  subtitle: string;
  details?: string;
  badge?: string;
  badgeColor?: string;
  secondaryBadge?: string;
  icon: string; // lucide icon identifier
  url: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface SearchCounts {
  all: number;
  candidates: number;
  applications: number;
  interviews: number;
  logbooks: number;
  followups: number;
  team: number;
}

/**
 * Normalizes phone numbers by stripping all non-digit characters.
 */
export function normalizePhoneDigits(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Checks whether candidate phone or WhatsApp matches query, supporting
 * formatted (e.g. "+1 (555) 019-2834") and unformatted ("5550192834") queries.
 */
export function matchesPhone(phoneOrWhatsapp: string | null | undefined, query: string): boolean {
  if (!phoneOrWhatsapp || !query) return false;
  
  const rawTarget = phoneOrWhatsapp.toLowerCase();
  const rawQuery = query.toLowerCase().trim();
  if (rawTarget.includes(rawQuery)) return true;

  const queryDigits = normalizePhoneDigits(query);
  if (queryDigits.length >= 3) {
    const targetDigits = normalizePhoneDigits(phoneOrWhatsapp);
    return targetDigits.includes(queryDigits);
  }

  return false;
}

/**
 * Multi-token case-insensitive matching helper.
 */
export function matchesTokens(targetText: string | null | undefined, queryTokens: string[]): boolean {
  if (!targetText || queryTokens.length === 0) return false;
  const lowerTarget = targetText.toLowerCase();
  return queryTokens.every(token => lowerTarget.includes(token));
}

/**
 * Evaluates whether any string field in a collection of candidate fields matches the search query.
 */
export function matchesAnyField(fields: (string | null | undefined)[], query: string): boolean {
  if (!query.trim()) return false;
  const trimmed = query.trim().toLowerCase();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  for (const field of fields) {
    if (!field) continue;
    const lower = field.toLowerCase();
    if (lower.includes(trimmed)) return true;
    if (tokens.length > 1 && matchesTokens(lower, tokens)) return true;
  }
  return false;
}

export interface PerformGlobalSearchParams {
  query: string;
  category?: SearchCategory;
  user: User | null;
  allUsers?: User[];
  isAurrumRoute?: boolean;
  candidates: Candidate[];
  applications?: Application[];
  interviews?: InterviewSupportRequest[];
  logbooks?: ResumeChangeRequest[];
  followups?: FollowUp[];
  team?: User[];
  limitPerCategory?: number;
}

export function performGlobalSearch({
  query,
  category = 'all',
  user,
  allUsers = [],
  isAurrumRoute = false,
  candidates = [],
  applications = [],
  interviews = [],
  logbooks = [],
  followups = [],
  team = [],
  limitPerCategory = 25
}: PerformGlobalSearchParams): { results: GlobalSearchResultItem[]; counts: SearchCounts } {
  const cleanQuery = query.trim();
  const queryTokens = cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);

  const counts: SearchCounts = {
    all: 0,
    candidates: 0,
    applications: 0,
    interviews: 0,
    logbooks: 0,
    followups: 0,
    team: 0
  };

  if (!cleanQuery) {
    return { results: [], counts };
  }

  const isAurrumRestricted = isAurrumRestrictedForUser(user);
  const isAurrum = !isAurrumRestricted && Boolean(isAurrumRoute || user?.role?.startsWith('aurrum_'));

  // 1. Build authorized candidate map (respects RBAC, shift preference, and brand separation)
  const authorizedCandidateMap = new Map<string, Candidate>();
  const matchedCandidates: GlobalSearchResultItem[] = [];

  for (const cand of candidates) {
    if (!cand || cand.deleted_at) continue;
    // Exclude test candidate specifically
    if (cand.id === 'test_edit_cand_1795118728093' || cand.phone === '+1 (555) 019-2834') continue;

    // Brand filtering
    const candIsAurrum = cand.crm_brand === 'aurrum';
    if (candIsAurrum && isAurrumRestricted) {
      continue;
    }
    if (isAurrum !== candIsAurrum && user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager') {
      continue;
    }

    // Role-based access check
    if (!canUserAccessCandidate(cand, user, allUsers)) {
      continue;
    }

    // Compliance Head shift check
    if (user?.role === 'jpc_cs' && !matchesProfileHandlingAccess(cand.shift_preference, user.profile_handling_access)) {
      continue;
    }

    authorizedCandidateMap.set(cand.id, cand);

    // Check query match against candidate fields
    const nameMatch = matchesTokens(cand.full_name, queryTokens);
    const idMatch = cand.id.toLowerCase().includes(cleanQuery.toLowerCase());
    const emailMatch = (cand.email || '').toLowerCase().includes(cleanQuery.toLowerCase());
    const phoneMatch = matchesPhone(cand.phone, cleanQuery) || matchesPhone(cand.whatsapp, cleanQuery);
    const domainMatch = matchesTokens(cand.domain_interested, queryTokens) || matchesTokens(cand.job_interest, queryTokens);
    const skillsMatch = matchesTokens(cand.skills, queryTokens);
    const notesMatch = matchesTokens(cand.notes, queryTokens);
    const sourceMatch = matchesTokens(cand.lead_source, queryTokens);

    if (nameMatch || idMatch || emailMatch || phoneMatch || domainMatch || skillsMatch || notesMatch || sourceMatch) {
      const stageInfo = STAGES[cand.current_stage as Stage];
      const stageLabel = stageInfo?.label?.split('. ')[1] || stageInfo?.label || cand.current_stage || 'Lead Generation';
      const isAurrumCand = cand.crm_brand === 'aurrum';

      matchedCandidates.push({
        id: cand.id,
        category: 'candidates',
        title: cand.full_name || 'Unnamed Candidate',
        subtitle: `${cand.phone || 'No phone'} • ${cand.email || 'No email'}`,
        details: `${cand.domain_interested || cand.job_interest || 'General'} • ID: ${cand.id}`,
        badge: stageLabel,
        badgeColor: stageInfo?.color || '#3B82F6',
        secondaryBadge: cand.shift_preference || (isAurrumCand ? 'Aurrum' : undefined),
        icon: 'User',
        url: isAurrumCand ? `#aurrum-candidate?id=${cand.id}` : `#candidate?id=${cand.id}`,
        timestamp: cand.updated_at || cand.created_at,
        metadata: {
          phone: cand.phone,
          whatsapp: cand.whatsapp,
          email: cand.email,
          stage: cand.current_stage,
          brand: cand.crm_brand
        }
      });
    }
  }

  counts.candidates = matchedCandidates.length;

  // 2. Applications / App Tracker
  const matchedApplications: GlobalSearchResultItem[] = [];
  for (const app of applications) {
    if (!app) continue;
    // Must be linked to authorized candidate or general permission
    if (app.candidate_id && !authorizedCandidateMap.has(app.candidate_id) && user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager') {
      continue;
    }

    // Brand filtering
    if (app.crm_brand === 'aurrum' && isAurrumRestricted) {
      continue;
    }
    if (isAurrum !== (app.crm_brand === 'aurrum') && user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin') {
      continue;
    }

    const cand = authorizedCandidateMap.get(app.candidate_id);
    const candName = cand?.full_name || '';

    const compMatch = matchesTokens(app.company_name, queryTokens);
    const titleMatch = matchesTokens(app.job_title, queryTokens);
    const linkMatch = (app.job_link || '').toLowerCase().includes(cleanQuery.toLowerCase());
    const notesMatch = matchesTokens(app.notes, queryTokens);
    const candMatch = candName ? matchesTokens(candName, queryTokens) : false;

    if (compMatch || titleMatch || linkMatch || notesMatch || candMatch) {
      matchedApplications.push({
        id: app.id,
        category: 'applications',
        title: app.company_name || 'Untitled Application',
        subtitle: `${app.job_title || 'Position'} • Candidate: ${candName || app.candidate_id}`,
        details: `Platform: ${app.sheet_type || 'Direct'} • Status: ${app.status || 'Applied'}`,
        badge: app.status || 'Applied',
        badgeColor: '#10B981',
        secondaryBadge: app.sheet_type,
        icon: 'Briefcase',
        url: `#applications?search=${encodeURIComponent(candName || app.company_name)}`,
        timestamp: app.applied_at || app.created_at,
        metadata: {
          candidateId: app.candidate_id,
          company: app.company_name,
          jobLink: app.job_link
        }
      });
    }
  }

  counts.applications = matchedApplications.length;

  // 3. Interview Support
  const matchedInterviews: GlobalSearchResultItem[] = [];
  for (const interview of interviews) {
    if (!interview) continue;
    if (isAurrumRestricted) {
      if ((interview as any).crm_brand === 'aurrum') continue;
      const c = candidates.find(cand => cand.id === interview.candidate_id);
      if (c?.crm_brand === 'aurrum') continue;
    }
    if (interview.candidate_id && !authorizedCandidateMap.has(interview.candidate_id) && user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager') {
      continue;
    }

    const cand = authorizedCandidateMap.get(interview.candidate_id);
    const candName = cand?.full_name || '';
    const compName = interview.interview_company_name || interview.company_name || '';

    const compMatch = matchesTokens(compName, queryTokens);
    const titleMatch = matchesTokens(interview.job_title, queryTokens);
    const candMatch = candName ? matchesTokens(candName, queryTokens) : false;
    const notesMatch = matchesTokens(interview.notes, queryTokens);
    const statusMatch = (interview.overall_status || '').toLowerCase().includes(cleanQuery.toLowerCase());

    if (compMatch || titleMatch || candMatch || notesMatch || statusMatch) {
      matchedInterviews.push({
        id: interview.id,
        category: 'interviews',
        title: compName || 'Interview Request',
        subtitle: `${interview.job_title || 'Interview'} • Candidate: ${candName || interview.candidate_id}`,
        details: `Type: ${interview.interview_type || 'Interview'} • Status: ${interview.overall_status?.replace(/_/g, ' ') || 'Pending'}`,
        badge: interview.overall_status?.replace(/_/g, ' ') || 'Pending',
        badgeColor: interview.overall_status === 'confirmed' ? '#10B981' : '#8B5CF6',
        secondaryBadge: interview.proxy_required ? 'Proxy Required' : undefined,
        icon: 'Video',
        url: isAurrum ? `#aurrum-interviews?search=${encodeURIComponent(candName || compName)}` : `#interview-support?search=${encodeURIComponent(candName || compName)}`,
        timestamp: interview.created_at,
        metadata: {
          candidateId: interview.candidate_id,
          company: compName,
          status: interview.overall_status
        }
      });
    }
  }

  counts.interviews = matchedInterviews.length;

  // 4. Resume & RTR Logbooks
  const matchedLogbooks: GlobalSearchResultItem[] = [];
  for (const log of logbooks) {
    if (!log) continue;
    if (log.candidate_id && !authorizedCandidateMap.has(log.candidate_id) && user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager') {
      continue;
    }

    const cand = authorizedCandidateMap.get(log.candidate_id);
    const candName = cand?.full_name || '';

    const detailsMatch = matchesTokens(log.details, queryTokens);
    const candMatch = candName ? matchesTokens(candName, queryTokens) : false;
    const statusMatch = (log.status || '').toLowerCase().includes(cleanQuery.toLowerCase());
    const tlNotesMatch = matchesTokens(log.tl_notes, queryTokens);
    const csNotesMatch = matchesTokens(log.cs_notes, queryTokens);

    if (detailsMatch || candMatch || statusMatch || tlNotesMatch || csNotesMatch) {
      matchedLogbooks.push({
        id: log.id,
        category: 'logbooks',
        title: candName ? `${candName} - Resume Change` : 'Resume Change Request',
        subtitle: log.details || 'Resume change log details',
        details: `Status: ${log.status?.replace(/_/g, ' ') || 'Pending'} • Recruiter: ${log.recruiter_id || 'N/A'}`,
        badge: log.status?.replace(/_/g, ' ') || 'Pending',
        badgeColor: log.status === 'completed' ? '#10B981' : '#F59E0B',
        icon: 'FileText',
        url: `#resume-log`,
        timestamp: log.updated_at || log.created_at,
        metadata: {
          candidateId: log.candidate_id,
          status: log.status
        }
      });
    }
  }

  counts.logbooks = matchedLogbooks.length;

  // 5. Follow-ups
  const matchedFollowUps: GlobalSearchResultItem[] = [];
  for (const f of followups) {
    if (!f) continue;
    if (f.candidate_id && !authorizedCandidateMap.has(f.candidate_id) && user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin' && user?.role !== 'jpc_manager') {
      continue;
    }

    // Brand filtering
    if (f.crm_brand === 'aurrum' && isAurrumRestricted) {
      continue;
    }
    if (isAurrum !== (f.crm_brand === 'aurrum') && user?.role !== 'administrator' && user?.role !== 'jpc_sysadmin') {
      continue;
    }

    const cand = authorizedCandidateMap.get(f.candidate_id);
    const candName = cand?.full_name || '';

    const noteMatch = matchesTokens(f.note, queryTokens);
    const candMatch = candName ? matchesTokens(candName, queryTokens) : false;
    const stageMatch = matchesTokens(f.stage, queryTokens);

    if (noteMatch || candMatch || stageMatch) {
      matchedFollowUps.push({
        id: f.id,
        category: 'followups',
        title: candName ? `Follow-up: ${candName}` : 'Candidate Follow-up',
        subtitle: f.note || 'No notes provided',
        details: `Stage: ${f.stage || 'General'} • Due: ${f.followup_date || 'N/A'}`,
        badge: f.done ? 'Done' : 'Pending',
        badgeColor: f.done ? '#10B981' : '#F59E0B',
        icon: 'Clock',
        url: `#follow-ups?search=${encodeURIComponent(candName || f.note || '')}`,
        timestamp: f.created_at,
        metadata: {
          candidateId: f.candidate_id,
          stage: f.stage
        }
      });
    }
  }

  counts.followups = matchedFollowUps.length;

  // 6. Team Members (Only accessible to Staff, forbidden to candidates)
  const matchedTeam: GlobalSearchResultItem[] = [];
  const isCandidateRole = user?.role === 'candidate' || user?.role === 'jpc_candidate';

  if (!isCandidateRole && team.length > 0) {
    for (const member of team) {
      if (!member) continue;
      if (isAurrumRestricted && isAurrumRole(member.role)) continue;
      const nameMatch = matchesTokens(member.display_name, queryTokens);
      const userMatch = (member.username || '').toLowerCase().includes(cleanQuery.toLowerCase());
      const emailMatch = (member.email || '').toLowerCase().includes(cleanQuery.toLowerCase());
      const roleMatch = (member.role || '').toLowerCase().includes(cleanQuery.toLowerCase());
      const phoneMatch = matchesPhone(member.phone, cleanQuery);

      if (nameMatch || userMatch || emailMatch || roleMatch || phoneMatch) {
        matchedTeam.push({
          id: String(member.id),
          category: 'team',
          title: member.display_name || member.username || 'Team Member',
          subtitle: `${member.role?.replace(/_/g, ' ') || 'Staff'} • ${member.email || 'No email'}`,
          details: `Username: @${member.username || member.id} • ${member.phone || 'No phone'}`,
          badge: member.role?.replace(/_/g, ' ') || 'Staff',
          badgeColor: '#8B5CF6',
          icon: 'Shield',
          url: `#team`,
          metadata: {
            username: member.username,
            role: member.role,
            email: member.email
          }
        });
      }
    }
  }

  counts.team = matchedTeam.length;

  // Total across all categories
  counts.all = counts.candidates + counts.applications + counts.interviews + counts.logbooks + counts.followups + counts.team;

  let results: GlobalSearchResultItem[] = [];

  if (category === 'all') {
    // Interleave or section top items from each category
    results = [
      ...matchedCandidates.slice(0, limitPerCategory),
      ...matchedApplications.slice(0, limitPerCategory),
      ...matchedInterviews.slice(0, limitPerCategory),
      ...matchedLogbooks.slice(0, limitPerCategory),
      ...matchedFollowUps.slice(0, limitPerCategory),
      ...matchedTeam.slice(0, limitPerCategory)
    ];
  } else if (category === 'candidates') {
    results = matchedCandidates.slice(0, limitPerCategory * 2);
  } else if (category === 'applications') {
    results = matchedApplications.slice(0, limitPerCategory * 2);
  } else if (category === 'interviews') {
    results = matchedInterviews.slice(0, limitPerCategory * 2);
  } else if (category === 'logbooks') {
    results = matchedLogbooks.slice(0, limitPerCategory * 2);
  } else if (category === 'followups') {
    results = matchedFollowUps.slice(0, limitPerCategory * 2);
  } else if (category === 'team') {
    results = matchedTeam.slice(0, limitPerCategory * 2);
  }

  return { results, counts };
}

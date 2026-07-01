import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { subscribeToCollection } from '../services/storage';
import { STAGES } from '../constants';
import { Search, Filter, X, Package, Phone, Mail, MapPin, Calendar, Users, ChevronRight, MoreVertical, ShieldCheck, Plus, Send, Table, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Candidate, Stage, User, Application, FollowUp } from '../types';
import { CandidateSheet } from '../components/CandidateSheet';
import { TrackJobSheet } from '../components/TrackJobSheet';
import { BulkImportModal } from '../components/BulkImportModal';
import { AddCandidateModal } from '../components/AddCandidateModal';
import { uploadFile } from '../services/fileService';
import * as XLSX from 'xlsx';

export const Candidates: React.FC = () => {
  const { user, isAuthReady } = useAuth();
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allRawCandidates, setAllRawCandidates] = useState<Candidate[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [trackingCandidate, setTrackingCandidate] = useState<Candidate | null>(null);
  const [isTrackSheetOpen, setIsTrackSheetOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  useEffect(() => {
    if (!isAuthReady) return;
    const unsub = subscribeToCollection<Candidate>('jpc_candidates', (data) => {
      setAllRawCandidates(data);
      setCandidates(data.filter(c => c.current_stage !== 'not_interested' && c.current_stage !== 'not_eligible'));
      setIsLoading(false);
    });

    const unsubUsers = subscribeToCollection<User>('jpc_users', (data) => {
      setAllUsers(data);
    });

    const unsubApps = subscribeToCollection<Application>('jpc_applications', (data) => {
      setApplications(data);
    });

    const unsubFollowUps = subscribeToCollection<FollowUp>('jpc_followups', (data) => {
      setFollowUps(data);
    });

    return () => {
      unsub();
      unsubUsers();
      unsubApps();
      unsubFollowUps();
    };
  }, [isAuthReady]);

  // Get stage from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const stage = params.get('stage');
    if (stage) setStageFilter(stage);
  }, []);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      // Lead Gen can only see their own leads
      if (user?.role === 'jpc_lead_gen' && String(c.lead_generated_by) !== String(user?.id)) return false;

      // Recruiter sees only their assigned ones
      if (user?.role === 'jpc_recruiter' && String(c.assigned_recruiter) !== String(user?.id)) return false;

      // Marketing TL sees only their cluster ones
      if (user?.role === 'jpc_marketing' && String(c.assigned_marketing_leader) !== String(user?.id)) return false;

      // Resume team sees only their assigned ones
      if (user?.role === 'jpc_resume' && String(c.assigned_resume) !== String(user?.id)) return false;

      const matchesSearch = 
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      
      const matchesStage = stageFilter ? c.current_stage === stageFilter : true;
      
      return matchesSearch && matchesStage;
    });
  }, [candidates, search, stageFilter, user]);

  const handleExportLeadsAndSales = () => {
    setIsExporting(true);
    try {
      if (allRawCandidates.length === 0) {
        showToast('No leads or sales data found to export', 'error');
        setIsExporting(false);
        return;
      }

      const cleanExcelValue = (val: any): string | number => {
        if (val === undefined || val === null) return '—';
        if (typeof val === 'number') return val;
        const str = String(val);
        if (str.startsWith('data:') && str.length > 500) {
          return '[Base64 File Payload - Too large for Excel]';
        }
        if (str.length > 30000) {
          return str.slice(0, 30000) + '... (Truncated due to Excel limit)';
        }
        return str;
      };

      // Map all Candidates (complete records, including all statuses)
      const dataRows = allRawCandidates.map(c => {
        const candidateFollowUps = followUps.filter(f => f.candidate_id === c.id);
        const hasActiveFollowUp = candidateFollowUps.some(f => !f.done);
        
        // Mapped Lead Status matching user requirement: Interested, Not Interested, Follow-up, Converted/Sales, Pending
        let leadStatus = 'Pending';
        if (c.current_stage === 'not_interested') {
          leadStatus = 'Not Interested';
        } else if (c.current_stage === 'not_eligible') {
          leadStatus = 'Not Eligible';
        } else if (c.current_stage === 'completed' || c.current_stage === 'offer') {
          leadStatus = 'Converted/Sales';
        } else if (c.current_stage === 'sales') {
          leadStatus = 'Converted/Sales';
        } else if (hasActiveFollowUp) {
          leadStatus = 'Follow-up';
        } else if (c.current_stage === 'lead_generation') {
          if (c.flags?.agreement_signed) {
            leadStatus = 'Interested';
          } else if (c.flags?.agreement_sent) {
            leadStatus = 'Pending';
          } else {
            leadStatus = 'Interested';
          }
        } else {
          leadStatus = 'Converted/Sales';
        }

        const leadGenUser = allUsers.find(u => String(u.id) === String(c.lead_generated_by));
        const salesUser = allUsers.find(u => String(u.id) === String(c.assigned_sales));
        const csUser = allUsers.find(u => String(u.id) === String(c.assigned_cs));
        const recruiterUser = allUsers.find(u => String(u.id) === String(c.assigned_recruiter));
        const marketingUser = allUsers.find(u => String(u.id) === String(c.assigned_marketing_leader));
        
        const totalApps = applications.filter(a => a.candidate_id === c.id).length;

        return {
          'Lead ID': c.id,
          'Full Name': cleanExcelValue(c.full_name),
          'Email': cleanExcelValue(c.email),
          'Phone': cleanExcelValue(c.phone),
          'WhatsApp': cleanExcelValue(c.whatsapp),
          'Mapped Lead Status': leadStatus,
          'Current System Stage': STAGES[c.current_stage]?.label || c.current_stage,
          'Lead Source': cleanExcelValue(c.lead_source),
          'Lead Generated By': leadGenUser?.display_name || 'System / self',
          'Assigned Sales Rep': salesUser?.display_name || 'Unassigned',
          'Assigned CS Rep': csUser?.display_name || 'Unassigned',
          'Assigned Recruiter': recruiterUser?.display_name || 'Unassigned',
          'Marketing Team Leader': marketingUser?.display_name || 'Unassigned',
          'Selected Plan / Package': cleanExcelValue(c.package_name),
          'Total Fee / Amount ($)': c.package_amount || 0,
          'Agreement Sent': c.flags?.agreement_sent ? 'Yes' : 'No',
          'Agreement Signed': c.flags?.agreement_signed ? 'Yes' : 'No',
          'QC Validation Passed': c.flags?.qc_checklist_done ? 'Yes' : 'No',
          'Resume Ready': c.flags?.resume_approved ? 'Yes' : 'No',
          'Marketing Mail Created': c.flags?.marketing_email_created ? 'Yes' : 'No',
          'Portal Login Set': c.temp_portal_password ? 'Yes' : 'No',
          'Job Application Count': totalApps,
          'Follow-ups Done/Scheduled': candidateFollowUps.length,
          'Degree': cleanExcelValue(c.degree),
          'University': cleanExcelValue(c.university),
          'Graduation Year': cleanExcelValue(c.graduation_year),
          'Experience (Years)': cleanExcelValue(c.experience_years),
          'Current Company': cleanExcelValue(c.current_company),
          'Current Designation': cleanExcelValue(c.current_designation),
          'Tech Skills': cleanExcelValue(c.skills),
          'Domain Suggested': cleanExcelValue(c.domain_suggested),
          'LinkedIn URL': cleanExcelValue(c.linkedin_url),
          'Portal Link': cleanExcelValue(c.portal_link),
          'Resume URL': cleanExcelValue(c.resume_url),
          'Remarks': cleanExcelValue(c.remarks),
          'Remarks / Notes': cleanExcelValue(c.notes),
          'Preferred Designation': cleanExcelValue(c.job_interest),
          'Location': cleanExcelValue(c.location),
          'Created Date': c.created_at ? new Date(c.created_at).toLocaleDateString() : '—',
          'Last Update Date': c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—',
        };
      });

      // Generate sheets
      const wsData = XLSX.utils.json_to_sheet(dataRows);
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsData, 'All Lead & Sales Data');

      // Autofit columns on data sheet
      const maxColWidths = dataRows.reduce((acc: any, row: any) => {
        Object.keys(row).forEach((key, colIndex) => {
          const val = String(row[key] || '');
          acc[colIndex] = Math.max(acc[colIndex] || 10, val.length + 3, key.length + 3);
        });
        return acc;
      }, []);
      wsData['!cols'] = maxColWidths.map((w: number) => ({ wch: w }));

      // Save Excel workbook file
      XLSX.writeFile(wb, `Leads_Sales_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Leads & Sales performance report generated and downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('An error occurred during report generation', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Candidates</h1>
          <p className="text-text-secondary mt-1">Manage and search through your candidate database.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportLeadsAndSales}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-3 bg-bg-secondary border border-border-primary rounded-2xl text-sm font-bold text-text-primary hover:bg-bg-tertiary transition-all cursor-pointer disabled:opacity-50"
              title="Download entire Leads & Sales database with complete status tracking"
            >
              <Download className="w-5 h-5 text-accent-green" />
              {isExporting ? 'Exporting...' : 'Export Report'}
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-bg-secondary border border-border-primary rounded-2xl text-sm font-bold text-text-primary hover:bg-bg-tertiary transition-all"
            >
              <Table className="w-5 h-5 text-accent-blue" />
              Import
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-accent-blue text-white font-bold rounded-2xl hover:bg-accent-blue/90 transition-all shadow-lg shadow-accent-blue/20"
            >
              <Plus className="w-5 h-5" />
              Add Candidate
            </button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search candidates..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg-secondary border border-border-primary rounded-2xl pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors shadow-sm"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <select 
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="w-full bg-bg-secondary border border-border-primary rounded-2xl pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors shadow-sm appearance-none"
            >
              <option value="">All Stages</option>
              {Object.entries(STAGES).filter(([key]) => key !== 'not_interested').map(([key, stage]) => (
                <option key={key} value={key}>{stage.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-bg-secondary rounded-3xl border border-border-primary overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-bg-tertiary/50 border-b border-border-primary">
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Candidate</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Portal</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Current Stage</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Package</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Last Update</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              <AnimatePresence mode="popLayout">
                {filteredCandidates.map((candidate, i) => (
                  <motion.tr 
                    key={candidate.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-bg-tertiary/30 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setIsSheetOpen(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary font-bold text-xs ring-2 ring-border-primary group-hover:ring-accent-blue transition-all">
                          {candidate.full_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary group-hover:text-accent-blue transition-colors">{candidate.full_name}</p>
                          <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {candidate.location || 'No location'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-medium text-text-secondary bg-bg-tertiary px-2 py-1 rounded border border-border-primary">
                        {candidate.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-xs text-text-primary flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-text-muted" /> {candidate.phone}
                        </p>
                        <p className="text-xs text-text-muted flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-text-muted" /> {candidate.email || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {allUsers.some(u => u.candidate_id === candidate.id) ? (
                        <div className="flex items-center gap-1.5 text-accent-green">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">Active</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-text-muted uppercase">No Access</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-bg-tertiary border border-border-primary rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STAGES[candidate.current_stage].color }} />
                        <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">
                          {STAGES[candidate.current_stage].label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-text-muted" />
                        <div>
                          <p className="text-xs font-bold text-text-primary">{candidate.package_name || '—'}</p>
                          <p className="text-[10px] text-text-muted">${candidate.package_amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-text-muted flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(candidate.updated_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(user?.role === 'administrator' || user?.role === 'jpc_sysadmin' || user?.role === 'jpc_manager' || user?.role === 'jpc_recruiter') && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrackingCandidate(candidate);
                              setIsTrackSheetOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue/5 text-accent-blue hover:bg-accent-blue text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all hover:text-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Track Job
                          </button>
                        )}
                        <button className="p-2 text-text-muted hover:text-accent-blue transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredCandidates.length === 0 && (
            <div className="p-20 text-center">
              <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-bold text-text-primary">No candidates found</h3>
              <p className="text-text-secondary mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>
      <CandidateSheet 
        candidate={selectedCandidate}
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setSelectedCandidate(null);
        }}
      />
      <TrackJobSheet 
        candidate={trackingCandidate}
        isOpen={isTrackSheetOpen}
        onClose={() => {
          setIsTrackSheetOpen(false);
          setTrackingCandidate(null);
        }}
        applications={applications}
      />

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {}}
      />
      <AddCandidateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
};

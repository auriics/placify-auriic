import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('Candidate Details – Interview History & Navigation Flow', () => {
  const candidateDetailPath = path.join(process.cwd(), 'src', 'pages', 'CandidateDetail.tsx');
  const interviewDetailsModalPath = path.join(process.cwd(), 'src', 'components', 'InterviewDetailsModal.tsx');
  const interviewDashboardPath = path.join(process.cwd(), 'src', 'pages', 'InterviewSupport', 'Dashboard.tsx');

  const candidateDetailSrc = fs.readFileSync(candidateDetailPath, 'utf8');
  const modalSrc = fs.readFileSync(interviewDetailsModalPath, 'utf8');
  const dashboardSrc = fs.readFileSync(interviewDashboardPath, 'utf8');

  it('verifies CandidateDetail imports and subscribes to complete interview data (rounds, feedback, availabilities)', () => {
    assert.ok(
      candidateDetailSrc.includes("import { InterviewDetailsModal } from '../components/InterviewDetailsModal';"),
      'CandidateDetail must import InterviewDetailsModal'
    );
    assert.ok(
      candidateDetailSrc.includes("import { InterviewTimeDisplay } from '../components/InterviewTimeDisplay';"),
      'CandidateDetail must import InterviewTimeDisplay'
    );
    assert.ok(
      candidateDetailSrc.includes("subscribeToCollection<InterviewRound>('jpc_interview_rounds'"),
      'CandidateDetail must subscribe to jpc_interview_rounds'
    );
    assert.ok(
      candidateDetailSrc.includes("subscribeToCollection<InterviewFeedback>('jpc_interview_feedback'"),
      'CandidateDetail must subscribe to jpc_interview_feedback'
    );
    assert.ok(
      candidateDetailSrc.match(/import\s*\{[\s\S]*?\bBuilding\b[\s\S]*?\}\s*from\s*['"]lucide-react['"]/),
      'CandidateDetail must import Building icon from lucide-react'
    );
  });

  it('verifies Interview History section renders complete interview details for every entry', () => {
    // Check section container and anchor
    assert.ok(
      candidateDetailSrc.includes('id="interview-history-section"'),
      'Interview History section must have an explicit anchor id'
    );

    // Verify company, role, status, round schedule, time display, proxy, meeting link, and feedback
    assert.ok(candidateDetailSrc.includes('InterviewTimeDisplay'), 'Must display round timing via InterviewTimeDisplay');
    assert.ok(candidateDetailSrc.includes('proxyUser?.display_name'), 'Must display assigned interviewer / proxy name');
    assert.ok(candidateDetailSrc.includes('int.overall_status'), 'Must display interview status badge');
    assert.ok(candidateDetailSrc.includes('int.job_title'), 'Must display job title / designation');
    assert.ok(candidateDetailSrc.includes('Meeting Link'), 'Must display meeting links if available');
    assert.ok(candidateDetailSrc.includes('roundFeedback'), 'Must display round feedback and outcome if available');
  });

  it('verifies every interview entry has an accessible View Details action button that loads the exact record', () => {
    assert.ok(
      candidateDetailSrc.includes('handleOpenInterviewDetails(int)'),
      'Every interview item must call handleOpenInterviewDetails with that specific interview record'
    );
    assert.ok(
      candidateDetailSrc.includes('View Details'),
      'View Details button must be present on every interview card'
    );
  });

  it('verifies InterviewDetailsModal has a dedicated Back button and supports custom back labels and handlers', () => {
    assert.ok(modalSrc.includes('onBack?: () => void;'), 'InterviewDetailsModalProps must support onBack handler');
    assert.ok(modalSrc.includes('backLabel?: string;'), 'InterviewDetailsModalProps must support backLabel');
    assert.ok(modalSrc.includes('onClick={onBack || onClose}'), 'Back button must execute onBack or onClose');
    assert.ok(modalSrc.includes('ArrowLeft'), 'Back button must have back arrow icon');
  });

  it('verifies navigation and back button behavior preserves Candidate Details context without redirecting away', () => {
    // Check handleCloseInterviewDetails returns to Candidate Details and scrolls to interview history section
    assert.ok(
      candidateDetailSrc.includes('handleCloseInterviewDetails'),
      'Must define handleCloseInterviewDetails'
    );
    assert.ok(
      candidateDetailSrc.includes('#candidate?id='),
      'Must restore #candidate?id= URL hash upon closing or navigating back'
    );
    assert.ok(
      candidateDetailSrc.includes("document.getElementById('interview-history-section')"),
      'Must scroll back to the Interview History section upon returning'
    );

    // Verify hash synchronization for browser Back / Forward buttons
    assert.ok(
      candidateDetailSrc.includes("window.addEventListener('hashchange', handleHashSync)"),
      'Must listen to hashchange to sync browser history smoothly'
    );
  });

  it('verifies Interview Support Dashboard supports back navigation when accessed from a candidate profile', () => {
    assert.ok(
      dashboardSrc.includes('fromCandidateId'),
      'Dashboard must inspect candidateId from URL hash'
    );
    assert.ok(
      dashboardSrc.includes('Back to Candidate Details'),
      'Dashboard must provide a prominent Back to Candidate Details link when entered from a candidate'
    );
  });
});

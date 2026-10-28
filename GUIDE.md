# Placify: Complete Platform Guide, Roles & Architecture Documentation

Welcome to **Placify** (by Auriic & Aurrum Careers). This document serves as the single source of truth for all user roles, permission boundaries, end-to-end operational workflows, background automation engines, and architectural specifications across the CRM platform.

---

## 1. User Roles & Multi-Brand Hierarchy

Placify utilizes an enterprise-grade Role-Based Access Control (RBAC) architecture with multi-brand tenant separation.

### 1.1 Core Management Roles
*   **Administrator (`administrator`)**: Complete system authority across all brands and features. Can manage user accounts, assign clusters, configure sales round-robin distribution, toggle staff shift statuses, override candidate pipeline stages, manage 15-day Free Trials, create Feature Blast alerts, and delete or reassign records.
*   **System Admin (`jpc_sysadmin`)**: Possesses identical administrative management privileges with technical oversight over OAuth integrations (Google Calendar, SMTP), cloud functions, idempotency stores, and serverless infrastructure.
*   **Operations Manager (`jpc_manager`)**: High-level operational leadership. Focuses on cross-team throughput, pipeline progression, target reductions, sales availability management, and can act as Team Leader or Compliance Head when needed.

### 1.2 Compliance & Customer Service Leadership
*   **Customer Service Head (`jpc_cs`)**: Oversees onboarding compliance, QC checklists, agreements, and payment verifications. Possesses authority to approve/reject **Interview-to-Offer** transitions (`isComplianceHead`), advance logbook requests (`canActAsTLForRequest`), override sales assignments, and manage 15-day Free Trials.
*   **Compliance Person (`jpc_compliance_person`)**: Works alongside the CS Head to audit candidate dossiers, inspect agreement contracts, manage payment records, toggle sales availability, and approve interview-to-offer clearance requests.

### 1.3 Recruiter & Marketing Team Leadership
*   **Marketing Leader / Team Leader (`jpc_marketing`)**: Leads recruiter clusters. Oversees application velocity, approves daily target reductions, conducts Level-1 approvals on resume/RTR requests (`pending_tl`), and has authority to **delete all scheduled Auriic interviews inside the Today and Upcoming views** as well as their team's interviews.
*   **Marketing Support (`jpc_marketing_support`)**: Operates as Team Leader Support to assist marketing leadership with candidate profile optimization and team interview coordination.
*   **Recruiter (`jpc_recruiter`)**: Executes high-volume daily job applications. Manages assigned candidates, tracks application targets (baseline 40/day), submits Interview Support requests, logs follow-ups, and requests resume or RTR updates.

### 1.4 Sales & Lead Generation
*   **Sales Representative (`jpc_sales`)**: Manages prospect conversion and enrollment packages. Authorized to toggle their personal shift availability (**Active / Deactive**) and manage 15-day Free Trials. Receives incoming leads sequentially via the automated Round-Robin engine during EST working hours.
*   **Lead Generation (`jpc_lead_gen`)**: Registers new prospect leads into the system. **Strict RBAC Rule**: Disallowed from manually selecting, modifying, or overriding `assigned_sales` (allocation is strictly handled by the automated Round-Robin engine or Management).

### 1.5 Specialized Support Roles
*   **Proxy Specialist (`jpc_proxy`)**: Conducts live technical interview support. Manages personal calendar availability (with manual blocking and recurring series), links Google Calendar via OAuth, reviews job descriptions, and submits structured technical evaluations.
*   **Resume Specialist (`jpc_resume`)**: Dedicated document engineering team responsible for tailoring resumes, fulfilling RTR requests, and conducting deep resume-understanding analysis.

### 1.6 Aurrum Careers Partition Roles
To ensure strict multi-brand data segregation between **Auriic** and **Aurrum Careers**:
*   **Aurrum Admin (`aurrum_admin`)**: Full administrative oversight over the dedicated Aurrum Careers workspace (`#aurrum-dashboard`, `#aurrum-candidates`, `#aurrum-sales`, `#aurrum-interviews`).
*   **Aurrum Sales (`aurrum_sales`)**: Dedicated sales conversion team for Aurrum Careers candidates.
*   **Aurrum Team (`aurrum_team`)**: Operational fulfillment staff for Aurrum Careers.
*   *Brand Isolation Guard*: Auriic operational staff (Recruiters, Lead Gen, Team Leaders) cannot view, modify, or delete Aurrum Careers records (`crm_brand: 'aurrum'`).

### 1.7 Candidate Role
*   **Candidate (`candidate`, `jpc_candidate`)**: The client being placed. Accesses the dedicated **Candidate Portal** to review application logs, payment receipts, active resume versions, and upcoming interview schedules.

---

## 2. Comprehensive RBAC Permissions Matrix

| Feature / Capability | Admin / Sysadmin / Manager | CS Head / Compliance | Recruiter Team Leader (TL) | Recruiter | Sales | Lead Gen | Resume Team | Proxy Specialist | Aurrum Roles |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **All-Company Dashboard & Metrics** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Personal Workload Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Aurrum) |
| **Add New Candidate / Lead** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ (Aurrum) |
| **Candidate Directory (All Records)** | ✅ | ✅ | ❌* | ❌* | ❌* | ❌* | ❌* | ❌* | ✅ (Aurrum Only) |
| **Candidate Directory (Assigned / Team)**| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (Aurrum) |
| **Candidate Shift Preference (Edit)** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **15-Day Free Trial (Activate/Manage)** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Sales Availability (Personal Toggle)** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Sales Availability (Global Override)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Sales Person Assignment (Manual)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌* | ❌ | ❌ | ❌ |
| **Lead Round-Robin Engine (Config)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Interview Support (Create Request)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Interview Support (Assign Proxy)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Delete Interview (Today & Upcoming)** | ✅ | ✅ | ✅ (All Auriic)* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Delete Interview (Other Views)** | ✅ | ✅ | ✅ (Team Scope)* | ✅ (Own Only)* | ❌ | ❌ | ❌ | ✅ (Own Only)* | ❌ |
| **Interview-to-Offer Clearance (Approve)**| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Resume & RTR Logs (Approve Pending TL)**| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Resume & RTR Logs (Fulfill Upload)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Target Reduction Request (Approve)** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Technical Feedback (All)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌* | ❌ |
| **Aurrum Careers Dedicated Workspace** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

*\*Matrix Footnotes & Guardrails:*
1. **Lead Generation Restriction**: Users with `jpc_lead_gen` role are strictly prohibited from selecting or modifying `assigned_sales` in both UI and backend APIs (`/api/leads`, `PATCH /api/candidates/:id`).
2. **Delete Interview Scoping**:
   - Management (Admin, Sysadmin, Manager, CS Head, Compliance Person) has full deletion authority across all views.
   - Recruiter Team Leaders (`jpc_marketing`, `jpc_marketing_support`) can delete all Auriic interviews inside the **Today** and **Upcoming** tabs, as well as team-associated interviews in other tabs.
   - **Aurrum Careers Isolation**: Team Leaders are strictly blocked from deleting any Aurrum Careers records (`crm_brand: 'aurrum'`).
   - The delete action is rendered **exclusively inside individual interview cards**. Global toolbar bulk deletion is disabled.
3. **Proxy Feedback Visibility**: Proxies can only view structured evaluations for rounds to which they were personally assigned.

---

## 3. Core Features, Workflows & Automated Engines

### 3.1 Candidate Shift Preference Engine
To streamline communication and interview coordination across international time zones:
*   **Three Preference Standards**:
    *   **Day Shift** (Blue badge with Sun icon): Candidate available during US Day working hours (EST/CST).
    *   **Night Shift** (Purple badge with Moon icon): Candidate available during US Night hours.
    *   **Not Set** (Gray badge): Default state when shift preference has not been determined.
*   **Platform Integration**:
    *   Configurable during candidate intake in the Add Candidate modal.
    *   Inline profile editing in the Candidate Detail workspace (`CandidateDetail.tsx`).
    *   Filterable multi-select in the Candidate Directory (`Candidates.tsx`).
    *   Visual status badges on candidate cards in the Pipeline Kanban (`Pipeline.tsx`).

### 3.2 Automated Welcome Email via SMTP
When a new candidate is registered in Placify:
*   **Automated Dispatch**: A branded HTML welcome email is immediately compiled and transmitted via the system's dynamic SMTP service (`services/welcomeEmail.ts`).
*   **Credential Delivery**: Provides the candidate with their portal credentials, a direct login link to the Candidate Portal, and initial placement instructions.
*   **Branded Presentation**: Built with an executive dark-themed layout, high-contrast typography, and dedicated support contact details.

### 3.3 Interview Support System & Proxy Lifecycle
The Interview Support System handles high-stakes multi-round technical interview logistics.

```
[ Recruiter Creates Request ]
           │
           ▼
[ Assign Proxy to Round ] ──(findBestProxyForWindow checks 15-min buffers & blocks)
           │
           ▼
[ Generate Booking Link / Copy to WhatsApp ]
           │
           ▼
[ Candidate Self-Schedules (9:30 AM - 6:30 PM EST, 30-min slots) ]
           │
           ▼
[ Auto-Sync to Google Calendar via OAuth2 ]
           │
           ▼
[ Live Interview Execution (Pulsing Red Indicator) ]
           │
           ▼
[ Proxy Submits Technical Feedback ]
           │
           ▼
[ Interview-to-Offer Clearance Approval Workflow ]
```

#### 3.3.1 Proxy Conflict Prevention & Availability Guard
*   **Mandatory Proxy Assignment**: Before generating a booking link for a proxy-facilitated round, the recruiter must assign an available proxy.
*   **Conflict Prevention Algorithm (`findBestProxyForWindow`)**: When scheduling or reassigning a proxy, the engine checks existing interviews, manual blocks, and enforces mandatory **15-minute buffers** before and after the interview window.
*   **Central Proxy Calendar**: Proxies manage availability within the permissible **9:30 AM to 6:30 PM EST** window. They can create manual breaks, leave blocks, or recurring daily/weekly weekday series with Firestore collision merging.
*   **Public Booking & CV Uploads**: Candidates use a public booking page (`BookingPage.tsx`) where large resume files are securely stored via chunked uploads in the public `jpc_cv_files` collection.

#### 3.3.2 Card-Level Interview Deletion Governance
*   **No Global "Delete All" Toolbar**: To protect production schedules from accidental mass deletions, bulk deletion controls on the Today/Upcoming toolbars are eliminated.
*   **In-Card Deletion Action**: The "Delete Interview" button is rendered exclusively within the individual interview card drawer.
*   **Team Leader Authority**:
    *   **Today & Upcoming Scope**: Team Leaders can delete any scheduled Auriic interview appearing inside the Today and Upcoming views.
    *   **Other Tabs**: Team Leaders can only delete interviews where the recruiter reports to them or the candidate belongs to their marketing cluster.
    *   **Aurrum Isolation**: Strictly blocks Team Leaders from deleting any interview belonging to an Aurrum Careers candidate (`candidate.crm_brand === 'aurrum'`).
*   **Cascading Atomic Cleanup**: Deleting an interview request cascades across `jpc_interview_requests`, `jpc_interview_rounds`, `jpc_interview_booking_links`, `jpc_interview_feedback`, `jpc_interview_notifications`, and `jpc_interview_activity_logs`, while automatically clearing associated Google Calendar events.

### 3.4 Interview-to-Offer Clearance & Compliance Workflow
Candidates in the `interviewing` stage cannot be arbitrarily advanced to `offer`.

```
[ Final Round Completed ]
           │
           ▼
[ Recruiter Submits Interview Completion Form (InterviewCompletionModal) ]
   - Attaches Offered Package, Role, Location, Expected Joining Date, Client Name
   - Logs Proxy Attendance & Technical Verdict
           │
           ▼
[ Candidate Status: pending_approval (jpc_interview_offer_requests) ]
           │
     ┌─────┴────────────────────────┐
     ▼                              ▼
[ Compliance Head Approves ]    [ Compliance Head Rejects ]
   - Candidate moves to 'offer'    - Candidate stays in 'interviewing'
   - Dispatches SMTP Notification  - Logs Rejection Reason in Dossier
```

*   **Role-Based Authority (`isComplianceHead`)**: Only Customer Service Head (`jpc_cs`, Faiz / Care), Compliance Persons (`jpc_compliance_person`), and Management (`administrator`, `jpc_sysadmin`, `jpc_manager`) can approve or reject clearance requests.
*   **Direct Transition Interception**: If a user attempts to change candidate stage to `offer` without an approved request, the transition is blocked by the system.

### 3.5 Sales Availability & Automated Lead Round-Robin Engine
To eliminate manual routing delays and distribute leads equitably:

```
[ Incoming Lead Created ]
           │
           ▼
[ Within EST Working Hours? (9:30 AM - 6:30 PM EST, Mon-Fri) ]
      │                                       │
 Yes  ▼                                   No  ▼
[ Active Sales Reps Available? ]         [ Mark Lead as UNASSIGNED ]
      │                                       ▲
 Yes  ▼                                   No  │
[ Continuous Round-Robin Pointer ] ───────────┘
   (Rotates: Rep A → Rep B → Rep C...)
           │
           ▼
[ Atomic Transaction Commit ]
   - Updates candidate: assigned_sales
   - Advances round-robin pointer
   - Logs to Assignment Audit Trail
```

*   **Shift Hours**: Bound strictly to **9:30 AM to 6:30 PM Eastern Time (America/New_York)**, Monday through Friday.
*   **Automated Crons**:
    *   **6:30 PM EST Daily**: System batch-deactivates all sales representatives to `'Deactive'`.
    *   **9:30 AM EST Morning**: Automatically starts the sales shift and triggers the Unassigned Backlog Engine.
*   **Unassigned Backlog Engine**: Processes unassigned leads accumulated overnight in chronological FIFO order, distributing them sequentially across reps who toggle their status to `'Active'`.
*   **Round-Robin Roster Dashboard**: Allows Management to pause automation, reorder reps using Move Up/Down, exclude reps temporarily, and audit historical assignments.

### 3.6 Three-Tier Duplicate Lead Prevention Architecture
Guarantees zero duplicate leads under rapid clicking, Enter keypresses, or network retries:
1.  **Tier 1: Frontend Synchronous Lock (`AddCandidateModal.tsx`)**: Synchronous `isSubmittingRef.current = true` lock closes the React state batching gap; pairs with a stable `idempotencyKeyRef` and disabled form submit buttons.
2.  **Tier 2: Backend Idempotency Store (`jpc_idempotency_keys`)**: Express server and Firestore services verify idempotency keys. Repeated submissions safely resolve to the existing candidate without re-running side effects or advancing the round-robin pointer.
3.  **Tier 3: Database Concurrency Control (`jpc_lead_locks`)**: Deterministic canonical phone locks (`jpc_lead_locks/phone_${cleanPhone}`) execute inside Firestore transactions. Colliding creations are atomically halted.

### 3.7 Multi-Level Resume Lifecycle & RTR Log Books
1.  **Request Initiation**: Recruiters submit Resume Change or Right-to-Represent (RTR) requests in the log books (status: `pending_tl`).
2.  **Level-1 TL Approval**: Marketing Team Leaders (`jpc_marketing`) review requests for profile positioning. Customer Service Head and Management possess override authority (`canActAsTLForRequest`) to advance requests to `pending_cs` if a TL is absent.
3.  **CS Verification**: CS Head confirms payment standing and package tier before routing to `pending_resume_team`.
4.  **Fulfillment**: The Resume Team uploads the finalized document, atomically updating the candidate's master record.
5.  **Role-Specific Custom Resumes ("Other Resume")**: Recruiters can attach a specialized custom resume for an interview request while preserving the master candidate resume.

### 3.8 15-Day Free Trial Management & Platform-Wide Badging
Allows prospective candidates to evaluate interview support services.
*   **Authorized Roles**: Admin, Sysadmin, Manager, Sales, and CS Head can activate, adjust dates, or end free trials.
*   **Omnipresent Badging**: Countdown badges (e.g., `14 Days Left`) display across Candidates Directory, Pipeline Kanban, Candidate Portal, Candidate Sheet, Interview Support dossiers, App Tracker, and Target Dashboard.

### 3.9 Compliance Central, Direct Support & Backout Exclusions
To maintain pristine reporting accuracy:
*   **Direct Interview Support Exclusion**: Candidates marked as `is_direct_interview_support: true` bypass standard onboarding queues and are automatically excluded from Compliance Central audits and monthly executive reports.
*   **Backout Candidate Exclusion**: Candidates with a recorded `backed_out_at` date are excluded from active performance statistics and reports from their backout date onward.

### 3.10 Aurrum Careers Multi-Brand Architecture
Placify houses two isolated commercial brands within a single infrastructure:
*   **Brand Key**: Identified via `candidate.crm_brand === 'aurrum'`.
*   **Dedicated Interfaces**: Separate navigation routes for Aurrum Dashboard, Aurrum Candidates, Aurrum Sales, and Aurrum Interviews.
*   **Partition Security**: Auriic staff cannot view, edit, or delete Aurrum records, protecting corporate boundary compliance.

### 3.11 Recruiter Daily Targets, Reductions & Crystalline Alerts
*   **Daily Target**: Recruiters maintain a baseline quota of 40 applications per day.
*   **Target Reduction Workflow**: Recruiters facing low job availability can submit a reduction request specifying a reason and target volume, reviewable by Team Leaders, CS Head, or Management.
*   **Crystalline Twinkle Alert**: Every weekday at 6:15 PM EST, an automated audit evaluates recruiter targets. Sub-par performance without an approved reduction triggers a Crystalline Twinkle alert to leadership.

### 3.12 Multi-Model AI Fallback & Resume Parsing Architecture
*   **Document Extractors**: Client workers extract raw text from PDF (`pdfjs-dist`), DOCX (`mammoth`), and TXT files.
*   **Tiered Model Chain**: Utilizes a tiered fallback chain to prevent API throttling:
    1.  `gemini-3.6-flash` (Primary extraction)
    2.  `gemini-3.8-flash` (Secondary fallback)
    3.  `gemini-flash-latest` (Tertiary fallback)
    4.  Deterministic regex heuristics for basic contact fields.

---

## 4. Automated Schedules & Cron Infrastructure

All automated crons are strictly anchored to **Eastern Time (America/New_York)**:

| Schedule (EST) | Cron Expression | Service / Purpose | Impacted Roles |
| :--- | :--- | :--- | :--- |
| **9:30 AM (Mon–Fri)** | `30 9 * * 1-5` | **Sales Shift Start & Backlog Processing**<br>Opens sales hours and automatically routes accumulated unassigned leads via round-robin. | Sales, Lead Gen, Management |
| **6:15 PM (Mon–Fri)** | `15 18 * * 1-5` | **Daily Target Audit ("Crystalline Twinkle")**<br>Evaluates recruiter daily application targets and alerts management of sub-par performance. | Recruiters, Team Leads, CS Head |
| **6:30 PM (Mon–Fri)** | `30 18 * * 1-5` | **Daily Sales Automatic Deactivation**<br>Concludes sales working hours; automatically switches active sales reps to `Deactive`. | Sales, Management |
| **10:00 AM (Month End)** | `0 10 28-31 * *` | **Executive KPI Performance Review**<br>Compiles comprehensive monthly placement and application statistics into a formatted XLSX and emails leadership. | Administrators, Managers |

---

## 5. Technical Stack & Architecture

*   **Frontend**: React 19, React Router 7, Tailwind CSS 4, Motion (animations), `react-window` (60fps virtualization).
*   **Backend Server**: Node.js with Express 5, bundled via esbuild for serverless deployment on Vercel.
*   **Database**: Firebase Firestore with transactional consistency, atomic locks (`jpc_lead_locks`), and security rules.
*   **Authentication**: Firebase Authentication with custom claims and session state management.
*   **AI Services**: Google Gemini API (`@google/genai`) with structured JSON schemas and model fallback.
*   **Calendar API**: Google Calendar API with OAuth2 offline refresh token exchange and automatic access token renewal.
*   **Email Engine**: Dynamic SMTP integration using NodeMailer with branded HTML templates.
*   **Timezone Core**: Standardized on **America/New_York (EST)** across all business logic and scheduler triggers.

---

## 6. Operational Guidelines

1.  **Sales Availability**: Sales representatives must verify their status is set to **Active** upon starting their shift at 9:30 AM EST. Reps must toggle to **Deactive** when stepping away or taking leave.
2.  **Interview Deletion**: Always prefer **Trigger Reschedule** over deleting an interview. Deleting an interview permanently removes evaluator feedback and audit history. Only use delete when an interview was created erroneously.
3.  **Lead Data Entry**: Lead Generation staff must ensure contact numbers and emails are formatted accurately. Never attempt to manually assign a salesperson; trust the automated round-robin engine.
4.  **Logbook Approvals**: Team Leaders and CS Heads should review `pending_tl` queues by mid-day to prevent resume preparation bottlenecks.
5.  **Proxy Evaluations**: Proxies must submit feedback immediately following interview rounds to allow recruiters to review verdicts and prepare candidates for subsequent rounds.

---

*Last Updated: October 28, 2026*

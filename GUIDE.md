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
| **Candidate Directory (All Records)** | ✅ | ✅ (Shift Scoped)* | ❌* | ❌* | ❌* | ❌* | ❌* | ❌* | ✅ (Aurrum Only) |
| **Profile Handling Access (Day / Night / All)** | ❌ (Full Admin) | ✅ (Shift Scoped)* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
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
4. **Compliance Head Profile Handling Scoping**:
   - Candidate access for `jpc_cs` is strictly bounded by their configured `profile_handling_access` setting (`Day Shift`, `Night Shift`, or `All`).
   - Day Shift Compliance Heads cannot view, search, or edit Night Shift candidates; Night Shift Compliance Heads cannot view, search, or edit Day Shift candidates.
   - Access is enforced at both frontend views/routes and backend API endpoints (`/api/candidates/:id`).
   - Unset legacy accounts default safely to **Day Shift**.

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

### 3.2 Compliance Head Profile Handling Access Engine
To maintain strict operational segregation between diurnal and nocturnal candidate management:
*   **Three Shift Access Tiers**:
    *   **Day Shift Profiles** (Sun icon): Access to view, search, audit, and manage candidate profiles marked as `Day Shift` (and unset profiles). Night Shift candidate profiles are completely inaccessible.
    *   **Night Shift Profiles** (Moon icon): Access to view, search, audit, and manage candidate profiles marked as `Night Shift`. Day Shift candidate profiles are completely inaccessible.
    *   **All Profiles** (Sparkles icon): Unrestricted dual-shift authority across both Day Shift and Night Shift candidate profiles.
*   **Administrative Configuration**:
    *   Configured in **Team Management → Edit / Add Team Member** whenever the role is selected as **Compliance Head (`jpc_cs`)**.
    *   Displays an intuitive 3-card selector with visual icons and descriptions, pre-populating with the member's currently saved setting.
    *   Member cards in the Team directory display an active access badge (`Day Shift Profiles`, `Night Shift Profiles`, or `All Profiles`).
*   **Multi-Layer Security & Dual Enforcement**:
    *   **Frontend Views & Direct URL Gating**: Candidate lists (`Candidates.tsx`), pipeline Kanban (`Pipeline.tsx`), direct detail URLs (`CandidateDetail.tsx`), executive and operational dashboards (`Dashboard.tsx`, `CRMDashboard.tsx`, `TargetDashboard.tsx`), application tracker (`AppTracker.tsx`), interview support (`InterviewSupport/Dashboard.tsx`), and logbooks (`RTRLogBook.tsx`, `ResumeLogBook.tsx`, `ResumePrepLog.tsx`) evaluate permissions via `canUserAccessCandidate()`. Direct URL navigation to an unauthorized candidate triggers an immediate access-denied redirect.
    *   **Backend API Enforcement**: `GET /api/candidates/:id` and `PATCH /api/candidates/:id` in `server.ts` verify candidate shift alignment against the requester's `profile_handling_access`, returning HTTP `403 Forbidden` on unauthorized access attempts.
    *   **Real-Time Propagation**: Active sessions subscribe to real-time `onSnapshot` updates on `jpc_users`, causing permission updates to take effect immediately without requiring a page refresh or re-login.
    *   **Safe Backward Compatibility**: Any existing Compliance Head account lacking an explicit `profile_handling_access` value defaults safely to `Day Shift`, guaranteeing that Night Shift profiles are never unintentionally exposed.

### 3.3 Automated Welcome Email via SMTP
When a new candidate is registered in Placify:
*   **Automated Dispatch**: A branded HTML welcome email is immediately compiled and transmitted via the system's dynamic SMTP service (`services/welcomeEmail.ts`).
*   **Credential Delivery**: Provides the candidate with their portal credentials, a direct login link to the Candidate Portal, and initial placement instructions.
*   **Branded Presentation**: Built with an executive dark-themed layout, high-contrast typography, and dedicated support contact details.

### 3.4 Interview Support System & Proxy Lifecycle
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

#### 3.4.1 Proxy Conflict Prevention & Availability Guard
*   **Mandatory Proxy Assignment**: Before generating a booking link for a proxy-facilitated round, the recruiter must assign an available proxy.
*   **Conflict Prevention Algorithm (`findBestProxyForWindow`)**: When scheduling or reassigning a proxy, the engine checks existing interviews, manual blocks, and enforces mandatory **15-minute buffers** before and after the interview window.
*   **Central Proxy Calendar**: Proxies manage availability within the permissible **9:30 AM to 6:30 PM EST** window. They can create manual breaks, leave blocks, or recurring daily/weekly weekday series with Firestore collision merging.
*   **Public Booking & CV Uploads**: Candidates use a public booking page (`BookingPage.tsx`) where large resume files are securely stored via chunked uploads in the public `jpc_cv_files` collection.

#### 3.4.2 Card-Level Interview Deletion Governance
*   **No Global "Delete All" Toolbar**: To protect production schedules from accidental mass deletions, bulk deletion controls on the Today/Upcoming toolbars are eliminated.
*   **In-Card Deletion Action**: The "Delete Interview" button is rendered exclusively within the individual interview card drawer.
*   **Team Leader Authority**:
    *   **Today & Upcoming Scope**: Team Leaders can delete any scheduled Auriic interview appearing inside the Today and Upcoming views.
    *   **Other Tabs**: Team Leaders can only delete interviews where the recruiter reports to them or the candidate belongs to their marketing cluster.
    *   **Aurrum Isolation**: Strictly blocks Team Leaders from deleting any interview belonging to an Aurrum Careers candidate (`candidate.crm_brand === 'aurrum'`).
*   **Cascading Atomic Cleanup**: Deleting an interview request cascades across `jpc_interview_requests`, `jpc_interview_rounds`, `jpc_interview_booking_links`, `jpc_interview_feedback`, `jpc_interview_notifications`, and `jpc_interview_activity_logs`, while automatically clearing associated Google Calendar events.

### 3.5 Interview-to-Offer Clearance & Compliance Workflow
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

### 3.6 Sales Availability & Automated Lead Round-Robin Engine
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

### 3.7 Three-Tier Duplicate Lead Prevention Architecture
Guarantees zero duplicate leads under rapid clicking, Enter keypresses, or network retries:
1.  **Tier 1: Frontend Synchronous Lock (`AddCandidateModal.tsx`)**: Synchronous `isSubmittingRef.current = true` lock closes the React state batching gap; pairs with a stable `idempotencyKeyRef` and disabled form submit buttons.
2.  **Tier 2: Backend Idempotency Store (`jpc_idempotency_keys`)**: Express server and Firestore services verify idempotency keys. Repeated submissions safely resolve to the existing candidate without re-running side effects or advancing the round-robin pointer.
3.  **Tier 3: Database Concurrency Control (`jpc_lead_locks`)**: Deterministic canonical phone locks (`jpc_lead_locks/phone_${cleanPhone}`) execute inside Firestore transactions. Colliding creations are atomically halted.

### 3.8 Multi-Level Resume Lifecycle & RTR Log Books
1.  **Request Initiation**: Recruiters submit Resume Change or Right-to-Represent (RTR) requests in the log books (status: `pending_tl`).
2.  **Level-1 TL Approval**: Marketing Team Leaders (`jpc_marketing`) review requests for profile positioning. Customer Service Head and Management possess override authority (`canActAsTLForRequest`) to advance requests to `pending_cs` if a TL is absent.
3.  **CS Verification**: CS Head confirms payment standing and package tier before routing to `pending_resume_team`.
4.  **Fulfillment**: The Resume Team uploads the finalized document, atomically updating the candidate's master record.
5.  **Role-Specific Custom Resumes ("Other Resume")**: Recruiters can attach a specialized custom resume for an interview request while preserving the master candidate resume.

### 3.9 15-Day Free Trial Management & Platform-Wide Badging
Allows prospective candidates to evaluate interview support services.
*   **Authorized Roles**: Admin, Sysadmin, Manager, Sales, and CS Head can activate, adjust dates, or end free trials.
*   **Omnipresent Badging**: Countdown badges (e.g., `14 Days Left`) display across Candidates Directory, Pipeline Kanban, Candidate Portal, Candidate Sheet, Interview Support dossiers, App Tracker, and Target Dashboard.

### 3.10 Compliance Central, Direct Support & Backout Exclusions
To maintain pristine reporting accuracy:
*   **Direct Interview Support Exclusion**: Candidates marked as `is_direct_interview_support: true` bypass standard onboarding queues and are automatically excluded from Compliance Central audits and monthly executive reports.
*   **Backout Candidate Exclusion**: Candidates with a recorded `backed_out_at` date are excluded from active performance statistics and reports from their backout date onward.

### 3.11 Aurrum Careers Multi-Brand Architecture
Placify houses two isolated commercial brands within a single infrastructure:
*   **Brand Key**: Identified via `candidate.crm_brand === 'aurrum'`.
*   **Dedicated Interfaces**: Separate navigation routes for Aurrum Dashboard, Aurrum Candidates, Aurrum Sales, and Aurrum Interviews.
*   **Partition Security**: Auriic staff cannot view, edit, or delete Aurrum records, protecting corporate boundary compliance.

### 3.12 Recruiter Daily Targets, Reductions & Crystalline Alerts
*   **Daily Target**: Recruiters maintain a baseline quota of 40 applications per day.
*   **Target Reduction Workflow**: Recruiters facing low job availability can submit a reduction request specifying a reason and target volume, reviewable by Team Leaders, CS Head, or Management.
*   **Crystalline Twinkle Alert**: Every weekday at 6:15 PM EST, an automated audit evaluates recruiter targets. Sub-par performance without an approved reduction triggers a Crystalline Twinkle alert to leadership.

### 3.13 Multi-Model AI Fallback & Resume Parsing Architecture
*   **Document Extractors**: Client workers extract raw text from PDF (`pdfjs-dist`), DOCX (`mammoth`), and TXT files.
*   **Tiered Model Chain**: Utilizes a tiered fallback chain to prevent API throttling:
    1.  `gemini-3.6-flash` (Primary extraction)
    2.  `gemini-3.8-flash` (Secondary fallback)
    3.  `gemini-flash-latest` (Tertiary fallback)
    4.  Deterministic regex heuristics for basic contact fields.

### 3.14 Candidate Stage SLA Monitoring & Real-Time Alerts
To prevent pipeline stagnation and guarantee timely turnaround across all recruitment stages:
*   **Timeout Threshold**: Standardized to **24 hours (1 day)** without stage progression or action (`TIMEOUT_MS = 24 * 60 * 60 * 1000`).
*   **Monitored Stages**: Active pipeline stages (`sales`, `cs_qc`, `marketing_leader`, `cs_strategy_check`, `resume_team`, `cs_assign_recruiter`, `recruiter`, `sys_admin`).
*   **Targeted Notification Hierarchy**:
    *   **Assigned Representative**: Receives urgent action alert (`"Action Required: Your assigned candidate [Name] has been stuck in the [Stage] stage for over 24 hours (1 day)!"`).
    *   **Lead Generator**: Receives candidate status tracking alert (`"Lead Update: A candidate you generated ([Name]) is stuck in the [Stage] stage for over 24 hours (1 day)."`).
    *   **Customer Service, Managers & Administrators**: Dispatched escalation alerts (`"SLA Warning: Candidate [Name] has been stuck in the [Stage] stage for over 24 hours (1 day) without action."`).
*   **Automatic Reset**: Moving a candidate to any subsequent stage automatically resets the `sla_timeout_notified` flag to `false`, restarting the 24-hour SLA window for the newly entered stage.

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

## 5. Centralized Feature Flags & Environment Control System

Placify provides a centralized, non-destructive feature flag architecture driven entirely via the environment configuration (`.env`). This system allows administrators and platform deployers to toggle major CRM modules, lifecycle stages, and commercial financial views without touching code or executing database migrations.

### 5.1 Environment Configuration Variables

```env
# Centralized Feature Flags (Set true to disable, false to enable)
DISABLE_OFFER_STAGE=false
DISABLE_COMPLETED_STAGE=false
DISABLE_PAYMENTS_REVENUE=false
```

### 5.2 Flag Definitions & Platform Impact

| Environment Flag | Default | Behavior When `true` | Restored When `false` |
| :--- | :---: | :--- | :--- |
| `DISABLE_OFFER_STAGE` | `false` | • **Pipeline Kanban**: Hides the "Offer" column and quick-jump pills.<br>• **Stage Progression**: Dynamic proxy removes "Offer" from all valid transitions (`TRANSITIONS[stage]`).<br>• **Candidate Detail**: `handleMoveToOffer` is blocked and guarded with alert notifications.<br>• **Interview Support**: Hides the "Offer Received" verdict from the Decision Console and disables Interview Completion Gate modals.<br>• **Compliance Central**: Blocks and rejects Interview-to-Offer clearance workflows.<br>• **Backend Guard**: `PATCH /api/candidates/:id`, `/api/candidate/notify-offer-*`, and `/api/interview-offer-requests` return `400 Bad Request`. | Restores Offer stage columns, transition buttons, decision verdicts, compliance approval workflows, and notification dispatches platform-wide. |
| `DISABLE_COMPLETED_STAGE` | `false` | • **Pipeline Kanban**: Hides the "10. Completed" column and mobile navigation pills.<br>• **Stage Progression**: Removes "Completed" from stage transitions and blocks stage closures.<br>• **Dashboard**: Dynamically removes the "Completed" KPI card and placement metrics.<br>• **Celebration Banner**: Suppresses placement celebration confetti and banners for completed candidates.<br>• **Backend Guard**: `PATCH /api/candidates/:id` blocks moving candidates to `completed`. | Restores Completed column, candidate closure transitions, dashboard KPI cards, placement counters, and celebration announcements. |
| `DISABLE_PAYMENTS_REVENUE` | `false` | • **CRM Leads & Sales (`#crm-dashboard`)**: Completely hides the menu item from Sidebar and Mobile Bottom Nav; intercepts direct route access and redirects to `#dashboard`.<br>• **Candidate Detail Profile**: Hides the entire Payments section (progress bars, payment list, upload proof, add plan form), Next Payment Due alerts, Package Amount edit input, and Total Amount view.<br>• **Candidate Directory**: Hides package fees from desktop rows and mobile cards; strips `'Total Fee / Amount ($)'` from XLSX exports.<br>• **Dashboards**: Hides "Gross Value" KPI cards and "Realized Revenue vs Potential Pipeline ($)" financial trajectory charts.<br>• **Aurrum Careers**: Hides Converted Revenue, Aurrum Pipeline Value cards, and deal terms.<br>• **Receipt Page (`#receipt`)**: Blocks rendering, hides receipt links, and redirects to `#dashboard`.<br>• **Storage & API Guard**: `addPayment` and `updatePayment` writes are rejected; backend strips `package_amount`, `total_paid`, and `balance_remaining` on update. | Restores all payment histories, receipt generators, gross value totals, revenue trajectory charts, plan forms, fee columns, and XLSX export columns. |

### 5.3 Technical Architecture & Data Safety Guarantees

*   **Non-Destructive Guarantee**: Disabling stages or financial modules **never** alters, truncates, or deletes historical Firestore records (`jpc_candidates`, `jpc_payments`, etc.). Existing records remain safely persisted and become fully visible again the moment flags are switched to `false`.
*   **Dual-Environment Accessibility**:
    *   **Client-Side (Vite)**: `vite.config.ts` exposes flags via `envPrefix: ['VITE_', 'DISABLE_']`, consumed via `import.meta.env` in `src/lib/featureFlags.ts`.
    *   **Server-Side (Node.js/Express)**: Loaded via `dotenv.config()` and evaluated from `process.env`.
*   **ES6 Proxy Routing**: `src/constants.ts` wraps `TRANSITIONS` and `PREVIOUS_STAGES` in reactive proxies that automatically evaluate active feature flags on property access, guaranteeing that UI components never receive disabled stage actions.

---

## 6. Technical Stack & Architecture

*   **Frontend**: React 19, React Router 7, Tailwind CSS 4, Motion (animations), `react-window` (60fps virtualization).
*   **Backend Server**: Node.js with Express 5, bundled via esbuild for serverless deployment on Vercel.
*   **Database**: Firebase Firestore with transactional consistency, atomic locks (`jpc_lead_locks`), and security rules.
*   **Authentication**: Firebase Authentication with custom claims and session state management.
*   **AI Services**: Google Gemini API (`@google/genai`) with structured JSON schemas and model fallback.
*   **Calendar API**: Google Calendar API with OAuth2 offline refresh token exchange and automatic access token renewal.
*   **Email Engine**: Dynamic SMTP integration using NodeMailer with branded HTML templates.
*   **Timezone Core**: Standardized on **America/New_York (EST)** across all business logic and scheduler triggers.

---

## 7. Operational Guidelines

1.  **Sales Availability**: Sales representatives must verify their status is set to **Active** upon starting their shift at 9:30 AM EST. Reps must toggle to **Deactive** when stepping away or taking leave.
2.  **Interview Deletion**: Always prefer **Trigger Reschedule** over deleting an interview. Deleting an interview permanently removes evaluator feedback and audit history. Only use delete when an interview was created erroneously.
3.  **Lead Data Entry**: Lead Generation staff must ensure contact numbers and emails are formatted accurately. Never attempt to manually assign a salesperson; trust the automated round-robin engine.
4.  **Logbook Approvals**: Team Leaders and CS Heads should review `pending_tl` queues by mid-day to prevent resume preparation bottlenecks.
5.  **Proxy Evaluations**: Proxies must submit feedback immediately following interview rounds to allow recruiters to review verdicts and prepare candidates for subsequent rounds.

---

*Last Updated: November 3, 2026*

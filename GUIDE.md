# Placify: Complete Platform Guide, Roles & Architecture Documentation

Welcome to **Placify** (by Auriic & Aurrum Careers). This document serves as the single source of truth for all user roles, permission boundaries, end-to-end operational workflows, background automation engines, feature flag controls, and architectural specifications across the CRM platform.

---

## 1. User Roles & Multi-Brand Hierarchy

Placify utilizes an enterprise-grade Role-Based Access Control (RBAC) architecture with multi-brand tenant separation.

### 1.1 Core Management Roles
*   **Administrator (`administrator`)**: Complete system authority across all brands and features. Can manage user accounts, assign clusters, configure sales round-robin distribution, toggle staff shift statuses, override candidate pipeline stages, manage 15-day Free Trials, create Feature Blast alerts, and delete or reassign records.
    *   *Protected Account Safeguard*: The platform enforces a persistent administrator role safeguard for key executive accounts (such as `darshan.wala@auriic.co`), ensuring uninterrupted management access and automatic persistence across session cache and Firestore `jpc_users`.
*   **System Admin (`jpc_sysadmin`)**: Possesses identical administrative management privileges with technical oversight over OAuth integrations (Google Calendar, SMTP), cloud functions, idempotency stores, and serverless infrastructure.
*   **Operations Manager (`jpc_manager`)**: High-level operational leadership. Focuses on cross-team throughput, pipeline progression, target reductions, sales availability management, and can act as Team Leader or Compliance Head when needed.

### 1.2 Compliance & Customer Service Leadership
*   **Customer Service Head (`jpc_cs`)**: Oversees onboarding compliance, QC checklists, agreements, and payment verifications. Possesses authority to approve/reject **Interview-to-Offer** transitions (`isComplianceHead`), advance logbook requests (`canActAsTLForRequest`), override sales assignments, and manage 15-day Free Trials. Candidate profile accessibility is strictly bounded by their configured `profile_handling_access` setting.
*   **Compliance Person (`jpc_compliance_person`)**: Works alongside the CS Head to audit candidate dossiers, inspect agreement contracts, manage payment records, toggle sales availability, and approve interview-to-offer clearance requests.

### 1.3 Recruiter & Marketing Team Leadership
*   **Marketing Leader / Team Leader (`jpc_marketing`)**: Leads recruiter clusters. Oversees application velocity, approves daily target reductions, conducts Level-1 approvals on resume/RTR requests (`pending_tl`), and has authority to **delete all scheduled Auriic interviews inside the Today and Upcoming views** as well as their cluster's interviews.
*   **Marketing Support (`jpc_marketing_support`)**: Operates as Team Leader Support to assist marketing leadership with candidate profile optimization and team interview coordination.
*   **Recruiter (`jpc_recruiter`)**: Executes high-volume daily job applications. Manages assigned candidates, tracks application targets (baseline 40/day), submits Interview Support requests, logs follow-ups, and requests resume or RTR updates.
    *   *Strict Candidate Isolation*: Recruiters can strictly only view and manage candidates directly assigned to them (`assigned_recruiter`) or candidates previously assigned to them (`previous_recruiters` history to preserve backout visibility). They cannot access unassigned leads or candidates of fellow recruiters, even within the same team leader cluster.
    *   *Basic Contact Info Guard*: Recruiters cannot modify candidate core contact details (name, email, phone, WhatsApp); changes require an authorized role via the Contact Edit modal.

### 1.4 Sales & Lead Generation
*   **Sales Representative (`jpc_sales`)**: Manages prospect conversion and enrollment packages. Authorized to toggle their personal shift availability (**Active / Deactive**), edit candidate contact details, and manage 15-day Free Trials. Receives incoming leads sequentially via the automated Round-Robin engine during EST working hours.
*   **Lead Generation (`jpc_lead_gen`)**: Registers new prospect leads into the system and can edit candidate basic contact details. **Strict RBAC Rule**: Disallowed from manually selecting, modifying, or overriding `assigned_sales` (allocation is strictly handled by the automated Round-Robin engine or Management).

### 1.5 Specialized Support Roles
*   **Proxy Specialist (`jpc_proxy`)**: Conducts live technical interview support. Manages personal calendar availability, date-range and indefinite leave scheduling (synced to Google Calendar), reviews job descriptions, and submits structured technical evaluations.
*   **Resume Specialist (`jpc_resume`)**: Dedicated document engineering team responsible for tailoring resumes, fulfilling RTR requests, and conducting deep resume-understanding analysis.

### 1.6 Aurrum Careers Partition Roles
To ensure strict multi-brand data segregation between **Auriic** and **Aurrum Careers**:
*   **Aurrum Admin (`aurrum_admin`)**: Full administrative oversight over the dedicated Aurrum Careers workspace (`#aurrum-dashboard`, `#aurrum-candidates`, `#aurrum-sales`, `#aurrum-interviews`).
*   **Aurrum Sales (`aurrum_sales`)**: Dedicated sales conversion team for Aurrum Careers candidates.
*   **Aurrum Team (`aurrum_team`)**: Operational fulfillment staff for Aurrum Careers.
*   *Brand Isolation Guard*: Auriic operational staff (Recruiters, Lead Gen, Team Leaders) cannot view, modify, or delete Aurrum Careers records (`crm_brand: 'aurrum'`).
*   *Account-Specific Partition Guard*: When `DISABLE_AURRUM_CAREERS_FOR_RAJ=true`, the user account `raj.lal@auriic.co` is completely restricted from Aurrum Careers (navigation items hidden, candidate access blocked, search results excluded, interview deletion blocked, and backend APIs returning HTTP 403).

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
| **Candidate Directory (Assigned / Team)**| ✅ | ✅ | ✅ | ✅ (Own Only)* | ✅ | ✅ | ❌ | ❌ | ✅ (Aurrum) |
| **Edit Candidate Basic Contact Info** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ (Aurrum) |
| **Candidate Shift Preference (Edit)** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Candidate Agreement Upload** | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **15-Day Free Trial (Activate/Manage)** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Sales Availability (Personal Toggle)** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Sales Availability (Global Override)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Sales Person Assignment (Manual)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌* | ❌ | ❌ | ❌ |
| **Lead Round-Robin Engine (Config)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Interview Support (Create Request)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Interview Support (Assign Proxy)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Delete Interview (Today & Upcoming)** | ✅ | ✅ | ✅ (All Auriic)* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Delete Interview (Other Views)** | ✅ | ✅ | ✅ (Team Scope)* | ✅ (Own Only)* | ❌ | ❌ | ❌ | ✅ (Own Only)* | ❌ |
| **View Proxy Leave Alert Banners** | ✅ | ✅ | ✅ | ✅ | ❌* | ❌* | ❌* | ✅ (Own/Team) | ❌* |
| **Interview-to-Offer Clearance (Approve)**| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Resume & RTR Logs (Approve Pending TL)**| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Resume & RTR Logs (Fulfill Upload)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Target Reduction Request (Approve)** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-Brand Global Search** | ✅ | ✅ (Shift Scoped) | ✅ (Team Scope) | ✅ (Own Scope) | ✅ | ✅ | ✅ | ✅ | ✅ (Aurrum) |
| **Aurrum Careers Dedicated Workspace** | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

*\*Matrix Footnotes & Guardrails:*
1. **Lead Generation Restriction**: Users with `jpc_lead_gen` role are strictly prohibited from selecting or modifying `assigned_sales` in both UI and backend APIs (`/api/leads`, `PATCH /api/candidates/:id`).
2. **Basic Contact Info Editing (`canEditCandidateBasicInfo`)**: Only Administrator, Sysadmin, Operations Manager, CS Head, Compliance Person, Sales, and Lead Generation roles can edit Candidate Name, Email, Phone, and WhatsApp. Recruiters, Resume Specialists, and Proxies are strictly prohibited from altering basic contact details.
3. **Recruiter Isolation & History**: Recruiters can only access candidates directly assigned to them (`assigned_recruiter`). When a candidate backs out or is reassigned, previous recruiters retain view access via the candidate's `previous_recruiters` array to preserve historical context and commission auditing.
4. **Delete Interview Scoping**:
   - Management (Admin, Sysadmin, Manager, CS Head, Compliance Person) has full deletion authority across all views.
   - Recruiter Team Leaders (`jpc_marketing`, `jpc_marketing_support`) can delete all Auriic interviews inside the **Today** and **Upcoming** tabs, as well as team-associated interviews in other tabs.
   - **Aurrum Careers Isolation**: Team Leaders and restricted accounts (Raj Lal) are strictly blocked from deleting any Aurrum Careers records (`crm_brand: 'aurrum'`).
   - The delete action is rendered **exclusively inside individual interview cards**. Global toolbar bulk deletion is disabled.
5. **Proxy Leave Privacy Scoping (`shouldHideProxyLeaveFromRole`)**: Real-time proxy leave status alerts and banners are hidden from Lead Generation, Sales, and Candidate roles to maintain operational privacy while remaining visible to Recruiters, Coordinators, and Management.
6. **Candidate Agreement Upload**: Uploading new or updated candidate agreements is strictly blocked across both client and server when `DISABLE_PAYMENTS_REVENUE=true`.
7. **Raj Lal Aurrum Restriction**: When `DISABLE_AURRUM_CAREERS_FOR_RAJ=true`, `raj.lal@auriic.co` is blocked from all Aurrum records across directory, search, detail pages, and deletion actions.

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
    *   **Frontend Views & Direct URL Gating**: Evaluated via `canUserAccessCandidate()`. Direct URL navigation to an unauthorized candidate triggers an immediate access-denied redirect.
    *   **Backend API Enforcement**: `GET /api/candidates/:id` and `PATCH /api/candidates/:id` in `server.ts` verify candidate shift alignment against the requester's `profile_handling_access`, returning HTTP `403 Forbidden` on unauthorized access attempts.
    *   **Safe Backward Compatibility**: Any existing Compliance Head account lacking an explicit `profile_handling_access` value defaults safely to `Day Shift`.

### 3.3 Interview Support System & Proxy Lifecycle
The Interview Support System manages multi-round technical interview logistics, proxy scheduling, leave tracking, and automated Google Calendar synchronization.

```
[ Recruiter Creates Request ]
           │
           ▼
[ Assign Proxy to Round ] ──(findBestProxyForWindow checks 15-min buffers, blocks & leave)
           │
           ▼
[ Generate Booking Link / Copy to WhatsApp ]
           │
           ▼
[ Candidate Self-Schedules (4:15 AM - 5:15 PM EST, 30-min slots) ]
           │
           ▼
[ Auto-Sync to Google Calendar via OAuth2 ]
           │
           ▼
[ Live Interview Execution (From-To Duration Display & Pulsing Indicator) ]
           │
           ▼
[ Proxy Submits Technical Feedback ]
           │
           ▼
[ Interview-to-Offer Clearance Approval Workflow ]
```

#### 3.3.1 Strict Scheduling Window (4:15 AM – 5:15 PM EST)
*   **Allowed Scheduling Window**: All candidate booking links and manual round scheduling enforce a strict window of **4:15 AM to 5:15 PM Eastern Time (America/New_York)**.
*   **Validation Guard**: Client services (`interviewService.ts`) and backend APIs (`api/index.js`, `server.ts`) automatically reject any interview slot scheduled outside this range.
*   **15-Minute Buffer Enforcement**: The `findBestProxyForWindow` algorithm enforces mandatory 15-minute buffers before and after interview windows to avoid proxy burnout and overlapping rounds.

#### 3.3.2 Proxy Date-Range Leave Management & Google Calendar Sync
Proxies can schedule date-range or indefinite leaves directly from their availability dashboard:
*   **Date-Range Leaves**: Proxies specify `leave_start_date` and `leave_end_date` in Eastern Time. The system auto-normalizes inverted dates and handles single-day or multi-week leaves.
*   **Google Calendar Auto-Sync**: When leave is saved, the platform builds an all-day calendar event with:
    *   **Summary**: Prominent `🔴 ON LEAVE: [Proxy Name] (Date Range EST)` indicator.
    *   **Color**: Tomato Red (`colorId: '11'`).
    *   **Transparency**: `opaque` (`busy`), automatically blocking Google Calendar FreeBusy booking queries.
    *   **Exclusive End Date**: Handled correctly across month, year, and leap-year boundaries.
*   **Real-Time Leave Alert Banner (`ProxyLeaveBanner.tsx`)**: Prominently rendered in Candidate Detail, Dashboard, Interview Support, and Proxy Dashboard, alerting coordinators to active or upcoming proxy leaves.
*   **Scheduling Conflict Guard**: `findBestProxyForWindow` and `assignProxiesForRounds` evaluate leave dates; if both proxies have booked leave on the selected date, the system halts with: `"BOTH PROXY MEMBERS HAVE LEAVE BOOKED FOR THE SELECTED DATE. NO PROXY IS AVAILABLE FOR THIS INTERVIEW."`
*   **Role-Based Privacy**: Leave banners are hidden from sales, lead generation, and candidates.

#### 3.3.3 Complete From-To Interview Time Display (`InterviewTimeDisplay.tsx`)
*   Every interview round clearly displays the full time range (e.g., `10:00 AM – 10:45 AM EST`) along with a duration badge (`30 min`, `45 min`, `60 min`).
*   Eliminates confusion between local browser times and candidate Eastern Time schedules across Candidate Dashboard, Booking Page, Proxy Dashboard, and Aurrum Interviews.

#### 3.3.4 Card-Level Interview Deletion Governance
*   **No Global "Delete All" Toolbar**: To protect production schedules from accidental mass deletions, bulk deletion controls on the Today/Upcoming toolbars are eliminated.
*   **In-Card Deletion Action**: The "Delete Interview" button is rendered exclusively within the individual interview card drawer.
*   **Team Leader Authority**: Team Leaders can delete all scheduled Auriic interviews inside the Today and Upcoming views, and team-associated interviews in other tabs. Aurrum Careers records are strictly protected from deletion by Auriic Team Leaders.
*   **Cascading Atomic Cleanup**: Deleting an interview request cascades across `jpc_interview_requests`, `jpc_interview_rounds`, `jpc_interview_booking_links`, `jpc_interview_feedback`, `jpc_interview_notifications`, and `jpc_interview_activity_logs`, while automatically clearing associated Google Calendar events.

#### 3.3.5 Centralised Office Holiday, Weekly Off & Interview Booking Management System
*   **Dedicated Management Calendar (`#office-holidays`)**: A comprehensive management calendar accessible by authorized roles, providing monthly calendar grids, recurring weekly off toggles, holiday modal management, override controls, and audit trails.
*   **Strict Role-Based Access Control (RBAC)**:
    *   **Higher Authorities / Management & System Admins (`administrator`, `jpc_sysadmin`, `jpc_manager`, `aurrum_admin`)**: Full authority to create, edit, delete, reschedule, and override any holiday or weekly off-day. Can modify weekly off configurations, reopen blocked working days, declare emergency closures, or override Saturday/Sunday rules.
    *   **Authorized Proxy Users (`jpc_proxy` with `can_manage_calendar: true`)**: Granted permissions to view the calendar, create closures, and manage events, but cannot override Higher Authority decisions.
    *   **Recruiters & Staff (`jpc_recruiter`, `jpc_marketing`, `jpc_sales`, `jpc_cs`, etc.)**: View-only access to holiday announcements, booking restrictions, and the monthly calendar. No administrative or override controls are exposed.
    *   **Candidates (`candidate`, `jpc_candidate`)**: Excluded from internal management screens.
*   **4-Tier Schedule Evaluation & Override Hierarchy**:
    1.  **Priority 1: Explicit Higher Authority Date Override (`is_working_day_override: true / false`)**: An explicit date override takes absolute precedence over all other rules. Can force a Saturday or Sunday to become bookable (`is_working_day_override: true`), or declare a normal weekday closed (`is_working_day_override: false`).
    2.  **Priority 2: Approved Custom Holiday / Special Office Closure**: Blocks single-day or multi-day periods (e.g. Christmas from Dec 24 to Dec 26 blocks all three dates).
    3.  **Priority 3: Configured Recurring Weekly Off-Days**: Recurring off-days configurable via settings (defaulting to Saturday [6] and Sunday [0]).
    4.  **Priority 4: Normal Working Day**: Open for interview bookings within the 4:15 AM – 5:15 PM EST scheduling window.
*   **Universal Booking Flow Integration**:
    *   **`BookingPage.tsx`**: Direct booking (`interview-support-only`) and token-based scheduling filter out closed dates and display real-time warning alerts: `"This is a non-working day. Our office is closed on weekends and US public holidays. Please select another date for the interview."`
    *   **`ProxyAssignmentModal.tsx`**: Validates selected dates against active closures, rendering an error badge and disabling assignment on non-working days.
    *   **`Dashboard.tsx` & `AurrumInterviewSupport.tsx`**: Validate round dates both during interactive form entry and upon submission.
    *   **Backend & API Enforcement (`server.ts`, `api/index.js`, `storage.ts`)**: `addInterviewRound`, `updateInterviewRound`, and `POST /api/interviews/validate-window` reject closed dates with the configured custom closure message.
*   **Google Calendar & Recruiter Notification Integration**:
    *   **Bidirectional Google Calendar Sync**: Office closures synchronize across team Google Calendars with `opaque` status and tomato red styling to block external scheduling.
    *   **Recruiter Notifications**: Automatically publishes in-app notifications to `jpc_notifications` whenever management changes office closure dates or weekly off configurations.
*   **Complete Audit Trail (`jpc_holiday_audit_logs`)**: Records every creation, update, deletion, schedule override, and weekly-off change with timestamp, actor credentials, and reason.

### 3.4 Candidate Contact Edit Separation (`EditCandidateModal.tsx`)
To protect data integrity while enabling rapid corrections:
*   **Separation of Concerns**: Basic contact information (Full Name, Email, Phone, WhatsApp) is decoupled from operational recruitment fields.
*   **Dedicated Modal**: Available directly from the Candidate Directory and Candidate Detail views.
*   **Authorized Roles**: Admin, Sysadmin, Operations Manager, CS Head, Compliance Person, Sales, and Lead Generation can edit contact details. Recruiters and Proxies are blocked.
*   **Whitelisted Mutation**: `updateCandidateBasicDetails` strictly enforces field whitelisting on both client and server, preventing arbitrary field updates.

### 3.5 App Tracker & Bulk Link Import Engine
The **Application Tracker (`#applications`)** tracks daily job submissions and provides high-speed link analysis.

#### 3.5.1 Candidate Visibility in App Tracker
Candidates appear in the App Tracker dropdown only when all 5 conditions are met:
1.  **Stage Restriction**: Candidate must be in **Marketing Active (`marketing_active`)** or **Interviewing (`interviewing`)**.
2.  **Recruiter Scope**: Regular recruiters only see candidates currently assigned to them or previously handled.
3.  **Marketing Leader Cluster**: Marketing TLs only see candidates assigned to themselves or recruiters in their cluster.
4.  **Compliance Head Shift Gating**: Filtered by `profile_handling_access` (Day Shift vs. Night Shift).
5.  **Active Brand**: Aurrum candidates and soft-deleted candidates are safely excluded.

#### 3.5.2 Bulk Import Job Links with Two-Tab Duplicate Analysis
*   **Import Modal**: Recruiters can paste hundreds of raw job links simultaneously.
*   **Export Excel with Duplicate Highlighting**:
    *   **Tab 1 – All Links**: Contains every imported job link with duplicates highlighted in **bright yellow** using OpenXML formatting.
    *   **Tab 2 – Duplicate Links**: Clean single column of duplicate URLs for rapid audit.
    *   **URL Normalization**: Normalizes URLs by stripping trailing slashes and tracking query parameters (`utm_*`, `ref`).

### 3.6 Multi-Brand Global Search Engine (`searchUtils.ts`)
The platform includes an omnichannel global search modal (`GlobalSearchModal.tsx`):
*   **Multi-Entity Indexing**: Searches across Candidates, Applications, Interview Requests, Resume/RTR Logbooks, Follow-Ups, and Team Members.
*   **Multi-Token & Phone Matching**: Supports formatted (`+1 (555) 019-2834`) and unformatted (`5550192834`) phone number searches, as well as multi-word queries.
*   **Multi-Brand & RBAC Isolation**:
    *   Aurrum Careers records are strictly isolated from Auriic operational staff.
    *   When `DISABLE_AURRUM_CAREERS_FOR_RAJ=true`, all Aurrum results are excluded for `raj.lal@auriic.co`.
    *   Recruiters only find candidates, applications, and interviews belonging to their assigned accounts.

### 3.7 Interview-to-Offer Clearance & Compliance Workflow
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

*   **Role-Based Authority (`isComplianceHead`)**: Only Customer Service Head (`jpc_cs`), Compliance Persons (`jpc_compliance_person`), and Management (`administrator`, `jpc_sysadmin`, `jpc_manager`) can approve or reject clearance requests.
*   **Direct Transition Interception**: Attempting to move candidate stage to `offer` without an approved clearance request is blocked by the system.

### 3.8 Sales Availability & Automated Lead Round-Robin Engine
To eliminate manual routing delays and distribute leads equitably:
*   **Shift Hours**: Bound strictly to **9:30 AM to 6:30 PM Eastern Time (America/New_York)**, Monday through Friday.
*   **Automated Crons**:
    *   **6:30 PM EST Daily**: System batch-deactivates all sales representatives to `'Deactive'`.
    *   **9:30 AM EST Morning**: Automatically starts the sales shift and triggers the Unassigned Backlog Engine.
*   **Unassigned Backlog Engine**: Processes unassigned leads accumulated overnight in chronological FIFO order, distributing them sequentially across reps who toggle their status to `'Active'`.
*   **Three-Tier Duplicate Lead Prevention**:
    1.  *Tier 1 (Frontend Synchronous Lock)*: Synchronous `isSubmittingRef.current = true` lock closes React state batching gap; pairs with stable `idempotencyKeyRef` and disabled buttons.
    2.  *Tier 2 (Backend Idempotency Store)*: Verified via `jpc_idempotency_keys` in Express server and Firestore services.
    3.  *Tier 3 (Database Concurrency Control)*: Deterministic canonical phone locks (`jpc_lead_locks/phone_${cleanPhone}`) execute inside Firestore transactions.

### 3.9 Multi-Level Resume Lifecycle & RTR Log Books
1.  **Request Initiation**: Recruiters submit Resume Change or Right-to-Represent (RTR) requests in the log books (status: `pending_tl`).
2.  **Level-1 TL Approval**: Marketing Team Leaders (`jpc_marketing`) review requests for profile positioning. Customer Service Head and Management possess override authority (`canActAsTLForRequest`) to advance requests to `pending_cs` if a TL is absent.
3.  **CS Verification**: CS Head confirms payment standing and package tier before routing to `pending_resume_team`.
4.  **Fulfillment**: The Resume Team uploads the finalized document, atomically updating the candidate's master record.
5.  **Role-Specific Custom Resumes ("Other Resume")**: Recruiters can attach a specialized custom resume for an interview request while preserving the master candidate resume.

### 3.10 15-Day Free Trial Management & Omnipresent Badging
*   **Authorized Roles**: Admin, Sysadmin, Manager, Sales, and CS Head can activate, adjust dates, or end free trials.
*   **Omnipresent Badging**: Countdown badges (e.g., `14 Days Left`) display across Candidates Directory, Pipeline Kanban, Candidate Portal, Candidate Sheet, Interview Support dossiers, App Tracker, and Target Dashboard.

### 3.11 Candidate Stage SLA Monitoring & Real-Time Alerts
*   **Timeout Threshold**: Standardized to **24 hours (1 day)** without stage progression or action (`TIMEOUT_MS = 24 * 60 * 60 * 1000`).
*   **Monitored Stages**: Active pipeline stages (`sales`, `cs_qc`, `marketing_leader`, `cs_strategy_check`, `resume_team`, `cs_assign_recruiter`, `recruiter`, `sys_admin`).
*   **Targeted Notification Hierarchy**: Assigned representative receives urgent action alert; Lead Generator receives status tracking update; CS, Managers, and Admins receive escalation alerts.
*   **Automatic Reset**: Moving a candidate to any subsequent stage resets `sla_timeout_notified` to `false`, restarting the 24-hour SLA window for the newly entered stage.

### 3.12 Automated Welcome Email via SMTP
*   **Automated Dispatch**: A branded HTML welcome email is immediately compiled and transmitted via the dynamic SMTP service (`services/welcomeEmail.ts`) upon candidate creation.
*   **Credential Delivery**: Provides candidate with portal credentials, direct login link, and onboarding instructions.

---

## 4. Automated Schedules & Cron Infrastructure

All automated crons are strictly anchored to **Eastern Time (America/New_York)**:

| Schedule (EST) | Cron Expression | Service / Purpose | Impacted Roles |
| :--- | :--- | :--- | :--- |
| **9:30 AM (Mon–Fri)** | `30 9 * * 1-5` | **Sales Shift Start & Backlog Processing**<br>Opens sales hours and automatically routes accumulated unassigned leads via round-robin. | Sales, Lead Gen, Management |
| **6:15 PM (Mon–Fri)** | `15 18 * * 1-5` | **Daily Target Audit ("Crystalline Twinkle")**<br>Evaluates recruiter daily application targets (40/day) and alerts leadership of sub-par performance. | Recruiters, Team Leads, CS Head |
| **6:30 PM (Mon–Fri)** | `30 18 * * 1-5` | **Daily Sales Automatic Deactivation**<br>Concludes sales working hours; automatically switches active sales reps to `Deactive`. | Sales, Management |
| **10:00 AM (Month End)** | `0 10 28-31 * *` | **Executive KPI Performance Review**<br>Compiles comprehensive monthly placement and application statistics into a formatted XLSX and emails leadership. | Administrators, Managers |

---

## 5. Centralized Feature Flags & Environment Control System

Placify provides a centralized, non-destructive feature flag architecture driven entirely via the environment configuration (`.env`). This system allows administrators and platform deployers to toggle major CRM modules, lifecycle stages, agreement uploads, and commercial views without touching code or executing database migrations.

### 5.1 Environment Configuration Variables

```env
# Centralized Feature Flags (Set true to disable, false to enable)
DISABLE_OFFER_STAGE=false
DISABLE_COMPLETED_STAGE=false
DISABLE_PAYMENTS_REVENUE=false
DISABLE_PIPELINE_APP_TRACKING=false
DISABLE_AURRUM_CAREERS_FOR_RAJ=false
```

### 5.2 Flag Definitions & Platform Impact

| Environment Flag | Default | Behavior When `true` | Restored When `false` |
| :--- | :---: | :--- | :--- |
| `DISABLE_OFFER_STAGE` | `false` | • **Pipeline Kanban**: Hides the "Offer" column and quick-jump pills.<br>• **Stage Progression**: Dynamic proxy removes "Offer" from all valid transitions (`TRANSITIONS[stage]`).<br>• **New Candidate Guard**: Moving new candidates to `offer` is blocked in UI and backend APIs.<br>• **Historical Candidate Support**: Existing candidates who are already in the Offer stage can still have their profiles updated (contact info, notes, recruiter/team assignment) without throwing transition errors.<br>• **Interview Support**: Hides "Offer Received" verdict from Decision Console and disables Interview Completion Gate modals.<br>• **Compliance Central**: Blocks and rejects Interview-to-Offer clearance workflows. | Restores Offer stage columns, transition buttons, decision verdicts, compliance approval workflows, and notification dispatches platform-wide. |
| `DISABLE_COMPLETED_STAGE` | `false` | • **Pipeline Kanban**: Hides the "10. Completed" column and mobile navigation pills.<br>• **Stage Progression**: Removes "Completed" from stage transitions and blocks stage closures.<br>• **Dashboard**: Dynamically removes the "Completed" KPI card and placement metrics.<br>• **Celebration Banner**: Suppresses placement celebration confetti and banners for completed candidates.<br>• **Backend Guard**: `PATCH /api/candidates/:id` blocks moving candidates to `completed`. | Restores Completed column, candidate closure transitions, dashboard KPI cards, placement counters, and celebration announcements. |
| `DISABLE_PAYMENTS_REVENUE` | `false` | • **Candidate Agreement Upload**: Hides agreement upload buttons in Candidate Detail; rejects agreement updates in `storage.ts` and backend APIs with a clear toast.<br>• **CRM Leads & Sales (`#crm-dashboard`)**: Completely hides menu item from Sidebar and Mobile Bottom Nav; intercepts direct route access and redirects to `#dashboard`.<br>• **Candidate Detail Profile**: Hides Payments section (progress bars, payment list, upload proof, add plan form), Next Payment Due alerts, Package Amount edit input, and Total Amount view.<br>• **Candidate Directory**: Hides package fees from desktop rows and mobile cards; strips `'Total Fee / Amount ($)'` from XLSX exports.<br>• **Dashboards**: Hides "Gross Value" KPI cards and financial trajectory charts.<br>• **Aurrum Careers**: Hides Converted Revenue and Pipeline Value cards.<br>• **Receipt Page (`#receipt`)**: Blocks rendering, hides receipt links, and redirects to `#dashboard`. | Restores all payment histories, candidate agreement upload controls, receipt generators, gross value totals, revenue trajectory charts, plan forms, fee columns, and XLSX export columns. |
| `DISABLE_PIPELINE_APP_TRACKING` | `false` | • **Pipeline Kanban**: Hides the "Application Tracking" column and mobile pills from the board.<br>• **Module Preservation**: The dedicated Application Tracker page (`#applications`) remains 100% functional and accessible.<br>• **Alternative Variable**: Also respects `DISABLE_APP_TRACKING_STAGE=true`. | Restores the "Application Tracking" column on the Pipeline Kanban board. |
| `DISABLE_AURRUM_CAREERS_FOR_RAJ` | `false` | • **Account Isolation**: Restricts `raj.lal@auriic.co` from accessing any Aurrum Careers records (`crm_brand: 'aurrum'`).<br>• **Navigation**: Hides Aurrum menus from Sidebar and Mobile Bottom Nav.<br>• **Search & Notifications**: Excludes Aurrum candidates, applications, and interviews from Global Search results and notifications.<br>• **Candidate Views & API**: Blocks direct URL access to Aurrum candidates and returns `403 Forbidden` on backend APIs.<br>• **Interview Deletion**: Blocks deleting Aurrum interviews in `canDeleteInterviewRequest`. | Restores normal Aurrum Careers access for `raj.lal@auriic.co` based on their role permissions. |

### 5.3 Technical Architecture & Data Safety Guarantees

*   **Non-Destructive Guarantee**: Disabling stages, agreement uploads, or financial modules **never** alters, truncates, or deletes historical Firestore records (`jpc_candidates`, `jpc_payments`, etc.). Existing records remain safely persisted and become fully visible again the moment flags are switched to `false`.
*   **Dual-Environment Accessibility**:
    *   **Client-Side (Vite)**: `vite.config.ts` exposes flags via `envPrefix: ['VITE_', 'DISABLE_']`, consumed via `import.meta.env` in `src/lib/featureFlags.ts`.
    *   **Server-Side (Node.js/Express)**: Loaded via `dotenv.config()` and evaluated from `process.env`.
*   **ES6 Proxy Routing**: `src/constants.ts` wraps `TRANSITIONS` and `PREVIOUS_STAGES` in reactive proxies that automatically evaluate active feature flags on property access, guaranteeing that UI components never receive disabled stage actions.

---

## 6. Technical Stack, Architecture & Performance Standards

*   **Frontend**: React 19, React Router 7, Tailwind CSS 4, Motion (animations).
*   **Virtualized High-Performance Lists**: Large tables and candidate lists employ `react-window` (import `{ List } from 'react-window'`) to maintain silky smooth 60fps scrolling.
*   **Bounded Pagination & Load More**: Collections exceeding 100 items utilize incremental "Load More" pagination (default increment: 100 items).
*   **Debounced Search**: Search inputs filtering large Firestore subscriptions use the `useDebounce` hook to eliminate UI stutter.
*   **Layout Safety & Truncation**: Dense views (Pipeline, Follow-ups, Application Tracker) enforce strict text truncation (`truncate`, `line-clamp`) to preserve layout integrity.
*   **Styling Standards**: Clean scrollbars using `custom-scrollbar` and `scrollbar-hide`.
*   **Backend Server**: Node.js with Express 5, bundled via esbuild for serverless deployment on Vercel.
*   **Database**: Firebase Firestore with transactional consistency, multi-tab persistent cache (`persistentLocalCache({ tabManager: persistentMultipleTabManager() })`), atomic locks (`jpc_lead_locks`), and security rules.
*   **Public Uploads**: The `jpc_cv_files` collection allows unauthenticated `create` and `write` to support candidates uploading resumes on the public `BookingPage`.
*   **Shared In-Memory Multi-Casting**: In-memory subscription multi-casting in `storage.ts` keeps active listeners warm with a 30-second grace window, delivering cached datasets instantaneously (0 ms) on menu switches.
*   **AI Services**: Google Gemini API (`@google/genai`) with structured JSON schemas and model fallback chain (`gemini-3.6-flash` → `gemini-3.8-flash` → `gemini-flash-latest`).
*   **Calendar API**: Google Calendar API with OAuth2 offline refresh token exchange and automatic access token renewal.
*   **Email Engine**: Dynamic SMTP integration using NodeMailer with branded HTML templates.
*   **Timezone Core**: Standardized on **America/New_York (EST)** across all business logic and scheduler triggers.

---

## 7. Operational Guidelines

1.  **Sales Availability**: Sales representatives must verify their status is set to **Active** upon starting their shift at 9:30 AM EST. Reps must toggle to **Deactive** when stepping away or taking leave.
2.  **Interview Scheduling**: All candidate interview rounds must fall strictly within **4:15 AM to 5:15 PM EST**. The system will automatically reject any scheduling attempts outside this window.
3.  **Proxy Leaves**: Proxies must register planned leaves in their availability dashboard in advance. The system will synchronize leave to Google Calendar in red (`🔴 ON LEAVE`) with opaque busy status, preventing scheduling conflicts.
4.  **Interview Deletion**: Always prefer **Trigger Reschedule** over deleting an interview. Deleting an interview permanently removes evaluator feedback and audit history. Only use delete when an interview was created erroneously.
5.  **Candidate Contact Updates**: Use the dedicated **Edit Contact** modal to correct candidate name, email, phone, or WhatsApp details. Recruiters cannot make these edits directly; contact Sales or CS leadership.
6.  **Recruiter Candidate Scope**: Recruiters must focus exclusively on their assigned candidate list. Candidates who back out remain visible to their former recruiter for historical auditing.
7.  **Lead Data Entry**: Lead Generation staff must ensure contact numbers and emails are formatted accurately. Never attempt to manually assign a salesperson; trust the automated round-robin engine.
8.  **Logbook Approvals**: Team Leaders and CS Heads should review `pending_tl` queues by mid-day to prevent resume preparation bottlenecks.
9.  **Proxy Evaluations**: Proxies must submit feedback immediately following interview rounds to allow recruiters to review verdicts and prepare candidates for subsequent rounds.

---

*Last Updated: November 24, 2026*

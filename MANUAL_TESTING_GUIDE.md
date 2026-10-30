# Clockify Clone — Complete Manual Testing Guide & Test Plan

This manual testing guide provides comprehensive, step-by-step instructions to verify every feature, workflow, role permission, and calculation in this Clockify clone application.

---

## Table of Contents

1. [Environment Setup & Pre-requisites](#1-environment-setup--pre-requisites)
2. [Default Seed Data & Test Accounts](#2-default-seed-data--test-accounts)
3. [Test Suite 1: Authentication & User Accounts](#3-test-suite-1-authentication--user-accounts)
4. [Test Suite 2: Multi-Tenant Workspaces & Settings](#4-test-suite-2-multi-tenant-workspaces--settings)
5. [Test Suite 3: Team Management & Role-Based Access Control (RBAC)](#5-test-suite-3-team-management--role-based-access-control-rbac)
6. [Test Suite 4: Client Management](#6-test-suite-4-client-management)
7. [Test Suite 5: Projects, Tasks, and Visibility Controls](#7-test-suite-5-projects-tasks-and-visibility-controls)
8. [Test Suite 6: Tag Management](#8-test-suite-6-tag-management)
9. [Test Suite 7: Time Tracker Engine (Live & Manual)](#9-test-suite-7-time-tracker-engine-live--manual)
10. [Test Suite 8: Timesheet History & Inline Editing](#10-test-suite-8-timesheet-history--inline-editing)
11. [Test Suite 9: Weekly Timesheet Grid](#11-test-suite-9-weekly-timesheet-grid)
12. [Test Suite 10: Reports, Analytics & CSV Export](#12-test-suite-10-reports-analytics--csv-export)
13. [Test Suite 11: Hourly Rate Cascading & Billing Accuracy](#13-test-suite-11-hourly-rate-cascading--billing-accuracy)
14. [Test Suite 12: Edge Cases, Validations & System Resilience](#14-test-suite-12-edge-cases-validations--system-resilience)
15. [Manual Testing Progress & Sign-off Checklist](#15-manual-testing-progress--sign-off-checklist)

---

## 1. Environment Setup & Pre-requisites

Before starting manual tests, ensure the local services (PostgreSQL, Redis, Next.js) are running and the database is seeded.

### Step 1: Start Docker Services
```bash
docker compose up -d
```
Verify containers are healthy:
```bash
docker compose ps
# Expected: clockify-postgres (port 5432) and clockify-redis (port 6379) running
```

### Step 2: Push Prisma Schema & Seed Demo Data
```bash
# Push database schema
npx prisma db push

# Populate initial workspace, users, projects, tags, and 30 days of time logs
npx prisma db seed
```

### Step 3: Start the Next.js Development Server
```bash
npm run dev
```
Open your browser to: **`http://localhost:3000`**

---

## 2. Default Seed Data & Test Accounts

The seed script creates the **`Acme Corp HQ`** workspace with the following accounts:

| User Name | Email Address | Password | Workspace Role | Member Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Alex Admin** | `admin@company.com` | `password123` | **ADMIN** | $75.00 / hr |
| **Morgan Manager** | `manager@company.com` | `password123` | **MANAGER** | $60.00 / hr |
| **Dev Dan** | `developer@company.com` | `password123` | **MEMBER** | $45.00 / hr |

### Pre-seeded Entities:
* **Workspace:** `Acme Corp HQ` (Currency: `USD`, Default Rate: `$50.00/hr`, Week Start: `Monday`)
* **Clients:** `Stripe Global`, `Spotify Media`, `Internal Projects`
* **Projects:**
  * `Payment Gateway Integration` (Client: Stripe, Rate: `$85.00/hr`, Billable: Yes, Color: `#06B6D4`)
  * `Audio Streaming API` (Client: Spotify, Rate: `$70.00/hr`, Billable: Yes, Color: `#10B981`)
  * `DevOps & Tooling` (Client: Internal, Rate: `$0.00/hr`, Billable: No, Color: `#F59E0B`)
* **Tasks:** `Webhook Handling`, `Checkout UI`, `Audio Pipeline`
* **Tags:** `bugfix`, `feature`, `meeting`
* **Historical Data:** 30 days of logged entries for all three team members

---

## 3. Test Suite 1: Authentication & User Accounts

### TC-AUTH-01: Sign in with Valid Admin Credentials
- **Preconditions:** Server and DB running.
- **Steps:**
  1. Navigate to `http://localhost:3000/login`.
  2. Enter Email: `admin@company.com`, Password: `password123`.
  3. Click **Sign In**.
- **Expected Result:**
  - [ ] Successfully redirected to `/tracker`.
  - [ ] Top navbar shows user name **"Alex Admin"** with role badge **"Admin"**.
  - [ ] Active workspace shows **"Acme Corp HQ"**.
  - [ ] Left sidebar shows navigation: Time Tracker, Timesheet, Projects, Clients, Tags, Reports, Team, and **Settings**.

### TC-AUTH-02: Sign in with Invalid Password
- **Steps:**
  1. Navigate to `/login`.
  2. Enter Email: `admin@company.com`, Password: `wrongPassword!`.
  3. Click **Sign In**.
- **Expected Result:**
  - [ ] User remains on `/login`.
  - [ ] Red alert banner displays: `"Invalid email or password."`.
  - [ ] No session cookie is created.

### TC-AUTH-03: Sign in with Unregistered Email
- **Steps:**
  1. Navigate to `/login`.
  2. Enter Email: `ghost@domain.com`, Password: `password123`.
  3. Click **Sign In**.
- **Expected Result:**
  - [ ] User remains on `/login`.
  - [ ] Error message: `"Invalid email or password."` is displayed.

### TC-AUTH-04: User Registration (Self-Signup)
- **Steps:**
  1. Navigate to `http://localhost:3000/register`.
  2. Verify that local timezone is auto-detected and displayed at the bottom (e.g. `America/New_York` or `Asia/Dhaka`).
  3. Enter:
     - Full Name: `Sarah Solo`
     - Work Email: `sarah@freelance.org`
     - Password: `password123`
  4. Click **Create Account**.
- **Expected Result:**
  - [ ] New user account is created with personal workspace: `"Sarah Solo's Workspace"`.
  - [ ] Automatically assigned role: **Admin** in the new personal workspace.
  - [ ] User is redirected to `/tracker` with empty state.

### TC-AUTH-05: Registration Password Length Validation
- **Steps:**
  1. Navigate to `/register`.
  2. Enter Full Name: `Short Pass`, Email: `short@test.com`, Password: `12345` (5 chars).
  3. Click **Create Account**.
- **Expected Result:**
  - [ ] Form prevents submission or returns error: `"Password must be at least 6 characters long."`.

### TC-AUTH-06: Session Persistence & Logout
- **Steps:**
  1. Log in as `admin@company.com`.
  2. Refresh the browser tab or open a new tab at `/tracker`.
  3. Verify session persists without prompting for login.
  4. Click the workspace switcher dropdown (top right/left) and click **Sign Out**.
- **Expected Result:**
  - [ ] Session cookie is wiped.
  - [ ] Redirected immediately to `/login`.
  - [ ] Attempting to navigate directly to `/tracker` redirects back to `/login`.

---

## 4. Test Suite 2: Multi-Tenant Workspaces & Settings

### TC-WS-01: Create a New Workspace
- **Preconditions:** Logged in as `admin@company.com`.
- **Steps:**
  1. Click the Workspace dropdown in the top navbar.
  2. Click **+ New Workspace**.
  3. Enter Workspace Name: `Beta Launch Labs`.
  4. Click **Create Workspace**.
- **Expected Result:**
  - [ ] New workspace is created with user as Admin.
  - [ ] Active workspace automatically switches to `Beta Launch Labs`.
  - [ ] Tracker page shows zero time entries (isolated from `Acme Corp HQ`).
  - [ ] Projects, Clients, and Tags lists are empty for this new workspace.

### TC-WS-02: Switch Between Workspaces (Data Isolation)
- **Steps:**
  1. While in `Beta Launch Labs`, open the workspace switcher dropdown.
  2. Select `Acme Corp HQ`.
- **Expected Result:**
  - [ ] Page reloads with context of `Acme Corp HQ`.
  - [ ] Pre-seeded entries, clients (`Stripe Global`), and projects (`Payment Gateway Integration`) reappear.
  - [ ] Data between workspaces remains completely isolated.

### TC-WS-03: Update Workspace Settings (Admin)
- **Preconditions:** Logged in as `admin@company.com` in `Acme Corp HQ`.
- **Steps:**
  1. Click **Settings** in the left sidebar (`/settings`).
  2. Update fields:
     - Workspace Name: `Acme Corp HQ Global`
     - Currency: `EUR (€)`
     - Default Hourly Rate: `65.00`
     - Week Starts On: `Sunday`
  3. Click **Save Changes**.
- **Expected Result:**
  - [ ] Success notification appears or page updates.
  - [ ] Top navbar shows updated name `Acme Corp HQ Global`.
  - [ ] Currency symbol changes to `€` across reports and billing badges.
  - [ ] Weekly Timesheet view shifts week start day to Sunday.

### TC-WS-04: Non-Admin Restricted from Settings
- **Steps:**
  1. Log out and log in as `developer@company.com` (`MEMBER` role).
  2. Notice that the **Settings** link is hidden from the sidebar.
  3. Manually type `http://localhost:3000/settings` in browser address bar.
- **Expected Result:**
  - [ ] User is immediately redirected away to `/tracker`.
  - [ ] Settings page cannot be viewed or modified by non-admins.

---

## 5. Test Suite 3: Team Management & Role-Based Access Control (RBAC)

### TC-TEAM-01: View Team Roster
- **Preconditions:** Logged in as `admin@company.com`.
- **Steps:**
  1. Click **Team** in the sidebar (`/team`).
- **Expected Result:**
  - [ ] Roster displays all 3 seeded members:
    - Alex Admin (Admin, $75.00/hr)
    - Morgan Manager (Manager, $60.00/hr)
    - Dev Dan (Member, $45.00/hr)
  - [ ] Table displays joined date and action controls.

### TC-TEAM-02: Invite a New Member by Email
- **Steps:**
  1. On `/team`, click **+ Invite Member**.
  2. Enter:
     - Email: `clara@company.com`
     - Role: `MEMBER`
     - Hourly Rate ($): `55.00`
  3. Click **Send Invitation**.
- **Expected Result:**
  - [ ] Success message displays.
  - [ ] An invite token link is generated and shown under **Pending Invitations**.
  - [ ] Copy Token button copies link/token to clipboard.

### TC-TEAM-03: Accept Invitation via Registration
- **Steps:**
  1. Open an Incognito/Private browser window.
  2. Navigate to `http://localhost:3000/register`.
  3. Register with:
     - Name: `Clara Coder`
     - Email: `clara@company.com` (matching invited email)
     - Password: `password123`
  4. Submit registration.
- **Expected Result:**
  - [ ] Clara is automatically bound to `Acme Corp HQ` workspace (instead of creating a lone workspace).
  - [ ] Clara has role `MEMBER` and hourly rate `$55.00/hr`.
  - [ ] In the Admin window (`/team`), Clara's invitation status moves from Pending to Active Member.

### TC-TEAM-04: Update Member Role and Hourly Rate
- **Steps:**
  1. Logged in as Admin, on `/team`, locate `Dev Dan`.
  2. Change Dan's role from `MEMBER` to `MANAGER`.
  3. Update Dan's hourly rate from `45.00` to `50.00`.
  4. Save changes.
- **Expected Result:**
  - [ ] Role badge updates to `Manager`.
  - [ ] New rate `$50.00/hr` is reflected.

### TC-TEAM-05: Workspace Owner Demotion/Removal Protection
- **Steps:**
  1. On `/team`, attempt to change `Alex Admin` (Workspace Owner) to `MEMBER` or click Remove.
- **Expected Result:**
  - [ ] System blocks the action with an error: `"The workspace owner must remain an Administrator."` / `"Cannot remove workspace owner."`.

### TC-TEAM-06: RBAC Verification Matrix
Log in as each role and verify navigation and capabilities:

| Feature / Action | Admin (`admin@`) | Manager (`manager@`) | Member (`developer@`) |
| :--- | :---: | :---: | :---: |
| Access Settings (`/settings`) | ✅ Allowed | ❌ Redirected | ❌ Redirected |
| Invite & Remove Team Members | ✅ Allowed | ❌ Hidden/Blocked | ❌ Hidden/Blocked |
| Create & Archive Projects | ✅ Allowed | ✅ Allowed | ❌ Hidden/Blocked |
| Create & Archive Clients | ✅ Allowed | ✅ Allowed | ❌ Hidden/Blocked |
| Create & Archive Tags | ✅ Allowed | ✅ Allowed | ❌ Hidden/Blocked |
| View Team-wide Reports | ✅ All Members | ✅ All Members | ❌ Own Entries Only |
| Track Own Time | ✅ Allowed | ✅ Allowed | ✅ Allowed |

---

## 6. Test Suite 4: Client Management

### TC-CLIENT-01: View Clients & Active Counts
- **Preconditions:** Logged in as `admin@company.com`.
- **Steps:**
  1. Click **Clients** in the sidebar (`/clients`).
- **Expected Result:**
  - [ ] Lists seeded clients: `Stripe Global`, `Spotify Media`, `Internal Projects`.
  - [ ] Shows number of linked projects for each client.

### TC-CLIENT-02: Create a New Client
- **Steps:**
  1. Click **+ New Client**.
  2. Enter Name: `Shopify Commerce`.
  3. Click **Add Client**.
- **Expected Result:**
  - [ ] `Shopify Commerce` appears in the clients list with `0 projects`.
  - [ ] Modal closes cleanly.

### TC-CLIENT-03: Prevent Duplicate Client Names
- **Steps:**
  1. Click **+ New Client**.
  2. Enter Name: `Shopify Commerce` (identical).
  3. Click **Add Client**.
- **Expected Result:**
  - [ ] Form displays error: `"A client with this name already exists in this workspace."`.

### TC-CLIENT-04: Edit Client Name
- **Steps:**
  1. Click the edit (pencil) icon next to `Shopify Commerce`.
  2. Rename to `Shopify International`.
  3. Click **Save** (check icon).
- **Expected Result:**
  - [ ] Client name updates inline to `Shopify International`.

### TC-CLIENT-05: Archive and Restore Client
- **Steps:**
  1. Click the **Archive** button on `Shopify International`.
  2. Verify `Shopify International` disappears from active list.
  3. Toggle **Show Archived** checkbox.
  4. Verify `Shopify International` appears with an "Archived" badge.
  5. Click **Restore / Unarchive**.
- **Expected Result:**
  - [ ] Client is restored to active clients list.
  - [ ] When creating a project, archived clients are excluded from client dropdown.

---

## 7. Test Suite 5: Projects, Tasks, and Visibility Controls

### TC-PROJ-01: View Projects List
- **Preconditions:** Logged in as `admin@company.com`.
- **Steps:**
  1. Click **Projects** in the sidebar (`/projects`).
- **Expected Result:**
  - [ ] Lists seeded projects:
    - `Payment Gateway Integration` (Client: Stripe, Color: Cyan, Billable: Yes)
    - `Audio Streaming API` (Client: Spotify, Color: Emerald, Billable: Yes)
    - `DevOps & Tooling` (Client: Internal, Color: Amber, Billable: No)
  - [ ] Shows client badges, hourly rates, and task counts.

### TC-PROJ-02: Create Public Project with Custom Color and Rate
- **Steps:**
  1. Click **+ New Project**.
  2. Enter:
     - Name: `Mobile App iOS`
     - Color: Select Purple (`#8B5CF6`)
     - Client: `Spotify Media`
     - Billable: Checked
     - Hourly Rate ($): `95.00`
     - Visibility: `Public`
  3. Click **Create Project**.
- **Expected Result:**
  - [ ] Project appears in list with purple swatch, Spotify client tag, `$95.00/hr` rate, and `Public` badge.

### TC-PROJ-03: Create Private Project with Assigned Members
- **Steps:**
  1. Click **+ New Project**.
  2. Enter:
     - Name: `Secret Internal R&D`
     - Color: Select Red (`#EF4444`)
     - Client: `Internal Projects`
     - Billable: Unchecked
     - Visibility: Uncheck `Public` (Private)
     - Assign Members: Select `Morgan Manager` only (do NOT select `Dev Dan`).
  3. Click **Create Project**.
- **Expected Result:**
  - [ ] Project created with a lock (`Private`) icon.

### TC-PROJ-04: Verify Private Project Access Restrictions
- **Steps:**
  1. Log out and log in as `developer@company.com` (`Dev Dan`).
  2. Navigate to `/projects`.
  3. Check if `Secret Internal R&D` is in the list.
  4. Navigate to `/tracker` and open Project selector.
- **Expected Result:**
  - [ ] `Secret Internal R&D` is **NOT visible** in Dan's projects list or timer selector.
  - [ ] Log in as `manager@company.com` (`Morgan Manager`) -> Project IS visible.

### TC-PROJ-05: Create Tasks Under Project
- **Preconditions:** Logged in as Admin.
- **Steps:**
  1. On `/projects`, locate `Mobile App iOS` and click expand (chevron) to view tasks.
  2. Click **+ Add Task**.
  3. Name: `UI Design System`.
  4. Click **Create Task**.
- **Expected Result:**
  - [ ] `UI Design System` appears under `Mobile App iOS` with status `ACTIVE`.

### TC-PROJ-06: Complete & Archive Task
- **Steps:**
  1. Click the status checkmark next to `UI Design System` to toggle to `DONE`.
  2. Click the archive icon.
- **Expected Result:**
  - [ ] Task status updates to `DONE`.
  - [ ] In `/tracker`, this task no longer appears in active task selection dropdowns.

### TC-PROJ-07: Archive Project
- **Steps:**
  1. Click **Archive** on `Mobile App iOS`.
- **Expected Result:**
  - [ ] Project disappears from active projects list.
  - [ ] In `/tracker`, project cannot be selected for new time tracking.
  - [ ] Past time entries linked to this project remain intact in reports.

---

## 8. Test Suite 6: Tag Management

### TC-TAG-01: Create and View Tags
- **Preconditions:** Logged in as `admin@company.com`.
- **Steps:**
  1. Click **Tags** in sidebar (`/tags`).
  2. Verify pre-seeded tags: `bugfix`, `feature`, `meeting`.
  3. Click **+ New Tag**.
  4. Name: `code-review`.
  5. Click **Add Tag**.
- **Expected Result:**
  - [ ] `code-review` tag is added to the list.

### TC-TAG-02: Edit and Archive Tag
- **Steps:**
  1. Click Edit on `code-review`, rename to `peer-review`, save.
  2. Click Archive on `peer-review`.
  3. Check **Show Archived** toggle.
- **Expected Result:**
  - [ ] Tag name updates to `peer-review`.
  - [ ] Archived tag disappears from active list; appears when filtered by archived.
  - [ ] Excluded from timer tag picker.

---

## 9. Test Suite 7: Time Tracker Engine (Live & Manual)

### TC-TIMER-01: Start and Run Live Timer
- **Preconditions:** Logged in as any user on `/tracker`.
- **Steps:**
  1. In the top Timer Bar:
     - Enter Description: `Building stripe webhook consumer`
     - Select Project: `Payment Gateway Integration`
     - Select Task: `Webhook Handling`
     - Select Tag: `feature`
     - Verify Billable icon ($) is active (inherited from project).
  2. Click **START**.
- **Expected Result:**
  - [ ] Button switches to red **STOP** button with elapsed ticking timer `00:00:01`, `00:00:02`...
  - [ ] Timer is saved to database (`endTime: null`) and cached in Redis.
  - [ ] Refresh the page -> Timer continues ticking without losing accumulated seconds.

### TC-TIMER-02: Stop Active Timer
- **Steps:**
  1. Allow timer from TC-TIMER-01 to run for at least 15 seconds.
  2. Click **STOP**.
- **Expected Result:**
  - [ ] Timer bar resets to `00:00:00` with input fields cleared.
  - [ ] The completed entry appears immediately at the top of the **Today** section below.
  - [ ] Shows description, project badge, task name, tag badge, duration, and billable icon.
  - [ ] Redis active cache is cleared.

### TC-TIMER-03: Discard Active Timer
- **Steps:**
  1. Click **START** to begin a new timer.
  2. Let it run for 5 seconds.
  3. Click the red **Trash / Discard** icon next to Stop.
- **Expected Result:**
  - [ ] Running timer stops and is deleted from DB.
  - [ ] No new entry is added to the timesheet list.
  - [ ] Timer bar resets to `00:00:00`.

### TC-TIMER-04: Auto-Stop Previous Timer on Starting New Timer
- **Steps:**
  1. Start Timer A with description: `First Task`.
  2. Let it run for 10 seconds.
  3. Without stopping Timer A, enter description: `Second Task` and click **START**.
- **Expected Result:**
  - [ ] Timer A is automatically stopped with calculated duration (~10s) and committed to timesheet.
  - [ ] Timer B starts ticking immediately.
  - [ ] Only one timer ever runs at any time per user in the workspace.

### TC-TIMER-05: Continue Past Entry (Play Action)
- **Steps:**
  1. In the timesheet list below, locate a completed entry.
  2. Hover over the entry and click the **Play (Continue)** button on the right.
- **Expected Result:**
  - [ ] Live timer starts immediately.
  - [ ] Pre-fills the exact description, project, task, tags, and billability of the selected past entry.

### TC-TIMER-06: Create Manual Time Entry (Start & End Time)
- **Steps:**
  1. On `/tracker`, click the mode switch button to toggle from **Timer** to **Manual** mode.
  2. Enter:
     - Description: `Sprint retrospective meeting`
     - Project: `Internal Projects` -> `DevOps & Tooling`
     - Tags: `meeting`
     - Date: Today's date
     - Start Time: `14:00`
     - End Time: `15:30`
  3. Click **ADD**.
- **Expected Result:**
  - [ ] New entry created with duration exactly `01:30:00` (90 minutes / 5400 seconds).
  - [ ] Appears in timesheet under Today.

### TC-TIMER-07: Create Manual Time Entry (Duration in Minutes)
- **Steps:**
  1. In Manual mode, leave Start/End times blank.
  2. Enter Duration: `45` (minutes).
  3. Description: `Documentation polish`.
  4. Click **ADD**.
- **Expected Result:**
  - [ ] Entry created with duration `00:45:00` (2700 seconds).

---

## 10. Test Suite 8: Timesheet History & Inline Editing

### TC-TS-01: Daily Grouping and Duration Summation
- **Steps:**
  1. Review the timesheet list on `/tracker`.
- **Expected Result:**
  - [ ] Entries are grouped by calendar day: `Today`, `Yesterday`, or `Mon, Oct 28`.
  - [ ] Right side of each day header displays the bold total worked time for that day (e.g. `04:15:00`).
  - [ ] Sum matches the exact total of durations of the individual entries listed beneath it.

### TC-TS-02: Inline Edit Past Entry Description & Billability
- **Steps:**
  1. Click the edit (pencil) icon on any past entry.
  2. Change Description: `Updated client bugfix note`.
  3. Toggle the Billable ($) icon.
  4. Click **Save** (check icon).
- **Expected Result:**
  - [ ] Entry updates immediately without requiring a full page refresh.
  - [ ] Hourly rate and billable amount are recalculated if billability was changed.

### TC-TS-03: Delete Time Entry
- **Steps:**
  1. Click the delete (trash) icon on a test entry.
  2. Confirm deletion.
- **Expected Result:**
  - [ ] Entry is removed from the list.
  - [ ] Daily total duration in the section header updates immediately (subtracting entry duration).

### TC-TS-04: Member Cannot Edit/Delete Other Users' Entries
- **Steps:**
  1. Log in as `developer@company.com` (`Dev Dan`).
  2. Check the tracker list.
- **Expected Result:**
  - [ ] Only Dev Dan's own entries are shown.
  - [ ] Dan cannot see, edit, or delete Alex's or Morgan's entries.

---

## 11. Test Suite 9: Weekly Timesheet Grid

### TC-WEEK-01: View 7-Day Matrix View
- **Preconditions:** Logged in as any user.
- **Steps:**
  1. Click **Timesheet (Weekly)** in the sidebar (`/timesheet`).
- **Expected Result:**
  - [ ] Displays a 7-day matrix columns corresponding to workspace week start (Monday to Sunday).
  - [ ] Existing entries logged for the current week are populated in corresponding Project/Task rows.
  - [ ] Column headers display date and daily totals.
  - [ ] Far-right column displays Row Total.
  - [ ] Bottom row displays Column Totals and Grand Total.

### TC-WEEK-02: Week Navigation Controls
- **Steps:**
  1. Click the **`<` (Previous Week)** button in the header.
  2. Click the **`>` (Next Week)** button.
- **Expected Result:**
  - [ ] Date headers shift by 7 days.
  - [ ] Rows and logged hours update to display entries corresponding to the chosen week.

### TC-WEEK-03: Add New Row to Weekly Timesheet
- **Steps:**
  1. Click **+ Add Row**.
  2. Select Project: `Spotify Media` -> `Audio Streaming API`.
  3. Select Task: `Audio Pipeline`.
  4. Click **Add to Timesheet**.
- **Expected Result:**
  - [ ] New row is created in the grid with empty input cells (`0.00`).

### TC-WEEK-04: Inline Cell Entry & Dynamic Total Recalculation
- **Steps:**
  1. In the newly added row, enter `3.5` (3h 30m) into Tuesday's cell.
  2. Click outside the cell (trigger `onBlur`).
  3. Enter `4.0` (4h) into Thursday's cell and blur.
- **Expected Result:**
  - [ ] Values persist.
  - [ ] Row total updates to `7.50` hrs (`7h 30m`).
  - [ ] Tuesday and Thursday column totals increment accordingly.
  - [ ] Grand total at bottom right increments by `7.50`.
  - [ ] Switch to `/tracker`: two new entries appear under Tuesday and Thursday.

---

## 12. Test Suite 10: Reports, Analytics & CSV Export

### TC-REP-01: Summary Metrics Cards
- **Preconditions:** Logged in as `admin@company.com`.
- **Steps:**
  1. Click **Reports** in sidebar (`/reports`).
  2. Select Preset: **This Month**.
- **Expected Result:**
  - [ ] Metric cards show:
    - **Total Hours** (e.g. `120.5h`)
    - **Billable Hours** vs **Non-Billable Hours**
    - **Total Billable Revenue** (e.g. `$9,450.00`) calculated with active currency symbol.

### TC-REP-02: Visual Charts Rendering
- **Steps:**
  1. Examine the analytics dashboard on `/reports`.
- **Expected Result:**
  - [ ] **Daily Trend Bar Chart:** Bars represent hours worked per calendar day.
  - [ ] **Project Breakdown Donut / Pie Chart:** Color-coded slices match project colors (`#06B6D4`, `#10B981`, etc.) with percentage tooltips.
  - [ ] Client and Team Member breakdowns are displayed clearly.

### TC-REP-03: Date Range Filtering Presets
- **Steps:**
  1. Click Preset dropdown and test:
     - **Today**
     - **This Week**
     - **Last Week**
     - **This Month**
     - **Custom Range** (Select custom start and end dates)
- **Expected Result:**
  - [ ] Dashboard metrics, charts, and detailed entry table refresh dynamically to reflect only records within the selected span.

### TC-REP-04: Multi-Facet Filtering
- **Steps:**
  1. On `/reports`, apply filters:
     - Client: `Stripe Global`
     - Project: `Payment Gateway Integration`
     - Billable: `Billable only`
     - Tag: `feature`
- **Expected Result:**
  - [ ] Detailed report table filters strictly to matching entries.
  - [ ] Summary cards show only Stripe billable hours and revenue.

### TC-REP-05: Member Scoping Restriction on Reports
- **Steps:**
  1. Log out and log in as `developer@company.com` (`Dev Dan` - `MEMBER`).
  2. Navigate to `/reports`.
- **Expected Result:**
  - [ ] Team member dropdown filter is hidden.
  - [ ] All metrics, charts, and table rows are strictly scoped to Dev Dan's logged hours.
  - [ ] Alex's and Morgan's entries are excluded.

### TC-REP-06: CSV Export Verification
- **Steps:**
  1. Logged in as Admin, apply any filter (e.g. `This Month`).
  2. Click **Export CSV** (download icon).
  3. Open the downloaded `.csv` file in a spreadsheet viewer or text editor.
- **Expected Result:**
  - [ ] Valid RFC 4180 CSV format.
  - [ ] Header columns present:
    ```
    Date, User, Email, Client, Project, Task, Tags, Description, Start Time, End Time, Duration (HH:MM:SS), Duration (Seconds), Billable, Hourly Rate ($), Billable Amount ($)
    ```
  - [ ] Commas and quotes in descriptions are properly escaped.
  - [ ] Numerical values for duration and billable amount match dashboard calculations.

---

## 13. Test Suite 11: Hourly Rate Cascading & Billing Accuracy

The system implements a strict 3-tier cascading rate hierarchy:
$$\text{Tier 1: Project Rate Override} \;\longrightarrow\; \text{Tier 2: Member Rate Override} \;\longrightarrow\; \text{Tier 3: Workspace Default Rate}$$

If an entry is marked **Non-Billable**, revenue is strictly **$0.00** regardless of any assigned rates.

---

### TC-RATE-01: Project Rate Override (Tier 1 - Highest Priority)
- **Goal:** Verify that a Project's custom hourly rate overrides both the user's member rate and the workspace default rate.
- **Setup & Rates:**
  - Workspace Default Rate: `$50.00/hr` (`/settings`)
  - Dev Dan Member Rate: `$45.00/hr` (`/team`)
  - Project `Payment Gateway Integration` Rate: `$85.00/hr` (`/projects`)
- **Step-by-Step Instructions:**
  1. Log in as **Dev Dan** (`developer@company.com` / `password123`) and navigate to `/tracker`.
  2. Click the **Manual Entry** tab.
  3. In *What did you work on?*, type: `Stripe integration tests`.
  4. Click **Project** and select `Payment Gateway Integration` (verify the billable `$` icon is highlighted).
  5. Set duration to `02:00:00` (or `120` minutes).
  6. Click **Add Entry** (or press Enter).
  7. Navigate to `/reports` and filter by Project `Payment Gateway Integration` (or click **Export CSV**).
- **Expected Result:**
  - [ ] Snapshotted hourly rate on the entry is `$85.00/hr` (project override takes precedence over Dan's `$45.00/hr` member rate).
  - [ ] Billable Revenue calculates as: $2\text{ hrs} \times \$85.00 = \mathbf{\$170.00}$.

---

### TC-RATE-02: Member Rate Override (Tier 2 - Fallback when Project has No Rate)
- **Goal:** Verify that when a project has no rate set (`$0.00` or left blank), the system falls back to the user's member rate.
- **Setup & Rates:**
  - Dev Dan Member Rate: `$45.00/hr` (`/team`)
  - Project `Generic Maintenance` has no hourly rate (blank/`$0.00`) and is marked billable.
- **Step-by-Step Instructions:**
  1. (As Admin) If `Generic Maintenance` does not exist, go to `/projects` -> **+ New Project**, name it `Generic Maintenance`, leave Hourly Rate empty, keep Billable enabled, and click **Create Project**.
  2. Log in as **Dev Dan** (`developer@company.com` / `password123`) and navigate to `/tracker`.
  3. Click **Manual Entry**.
  4. In *What did you work on?*, type: `Refactoring auth utilities`.
  5. Select Project: `Generic Maintenance` (verify billable `$` icon is active).
  6. Set duration to `02:00:00` (or `120` minutes).
  7. Click **Add Entry**.
  8. Navigate to `/reports` and filter by Project `Generic Maintenance` (or click **Export CSV**).
- **Expected Result:**
  - [ ] Snapshotted hourly rate on the entry is `$45.00/hr` (falls back to Dev Dan's member rate).
  - [ ] Billable Revenue calculates as: $2\text{ hrs} \times \$45.00 = \mathbf{\$90.00}$.

---

### TC-RATE-03: Workspace Default Rate (Tier 3 - Fallback when Both Project and Member Rates are Empty)
- **Goal:** Verify that when neither the project nor the team member has a custom rate, the system falls back to the workspace default rate.
- **Setup & Rates:**
  - Workspace Default Rate: `$50.00/hr` (`/settings`)
  - Team Member `Clara Coder` has no custom rate override (blank/null at `/team`)
  - Project `Open Support` has no project rate override (blank/null at `/projects`)
- **Step-by-Step Instructions:**
  1. (As Admin) Open `/team`, confirm or set **Clara Coder** (`clara@company.com`) Hourly Rate to blank/empty and click **Save**.
  2. (As Admin) Open `/projects`, confirm or create a billable project `Open Support` with Hourly Rate left blank.
  3. Log in as **Clara Coder** (`clara@company.com` / `password123`) and navigate to `/tracker`.
  4. Click **Manual Entry**.
  5. In *What did you work on?*, type: `Customer ticket escalation`.
  6. Select Project: `Open Support` (verify billable `$` icon is active).
  7. Set duration to `03:00:00` (or `180` minutes).
  8. Click **Add Entry**.
  9. Navigate to `/reports` and filter by Project `Open Support` (or click **Export CSV**).
- **Expected Result:**
  - [ ] Snapshotted hourly rate on the entry is `$50.00/hr` (falls back to workspace default rate).
  - [ ] Billable Revenue calculates as: $3\text{ hrs} \times \$50.00 = \mathbf{\$150.00}$.

---

### TC-RATE-04: Non-Billable Entries (Strict $0.00 Revenue)
- **Goal:** Verify that time entries logged on non-billable projects produce strictly $0.00 revenue regardless of any configured rates.
- **Setup & Rates:**
  - Project `DevOps & Tooling` is set to Non-Billable (`isBillable: false`) at `/projects`.
- **Step-by-Step Instructions:**
  1. Log in as any user (e.g. `developer@company.com` or `admin@company.com`) and navigate to `/tracker`.
  2. Click **Manual Entry**.
  3. In *What did you work on?*, type: `Kubernetes node upgrade`.
  4. Select Project: `DevOps & Tooling`.
  5. Notice the billable `$` icon automatically dims/turns off.
  6. Set duration to `05:00:00` (or `300` minutes).
  7. Click **Add Entry**.
  8. Navigate to `/reports` and select preset **Today**.
- **Expected Result:**
  - [ ] Billable amount for this entry is strictly $\mathbf{\$0.00}$.
  - [ ] The `5.0 hrs` are logged under **Non-Billable Hours** on the dashboard.
  - [ ] Total Hours increases by `5.0h`, but Total Revenue remains unchanged ($+\$0.00$).

---

## 14. Test Suite 12: Edge Cases, Validations & System Resilience

### TC-EDGE-01: Redis Caching & Graceful Fallback
- **Steps:**
  1. Start a live timer on `/tracker`.
  2. In terminal, stop the Redis container:
     ```bash
     docker compose stop redis
     ```
  3. Reload `/tracker` and start a second timer or stop the active timer.
- **Expected Result:**
  - [ ] System handles Redis disconnection without throwing 500 errors.
  - [ ] Falls back seamlessly to PostgreSQL storage for the active timer.
  - [ ] Restart Redis (`docker compose start redis`) -> system recovers cache write-through.

### TC-EDGE-02: Manual Entry Across Midnight
- **Steps:**
  1. In Manual mode, set Date: `2026-10-30`.
  2. Start Time: `23:00`, End Time: `02:00` (next morning).
  3. Click **ADD**.
- **Expected Result:**
  - [ ] System detects midnight crossing and logs duration as `03:00:00` (3 hours / 10800s), avoiding negative numbers.

### TC-EDGE-03: Multiple Tabs Live Timer Synchronization
- **Steps:**
  1. Open `/tracker` in two separate browser tabs side by side.
  2. Click **START** in Tab 1.
  3. Refresh or view Tab 2.
- **Expected Result:**
  - [ ] Tab 2 detects and displays the active running timer with matching elapsed time.
  - [ ] Clicking **STOP** in Tab 2 updates the state in both tabs upon refresh.

### TC-EDGE-04: Empty States Verification
- **Steps:**
  1. Switch to a brand-new empty workspace.
  2. Inspect `/tracker`, `/timesheet`, `/projects`, `/clients`, `/tags`, `/reports`.
- **Expected Result:**
  - [ ] All pages display clean, friendly empty states with action buttons (e.g. "No projects found. Create your first project").
  - [ ] No JavaScript crashes or unhandled exceptions.

---

## 15. Manual Testing Progress & Sign-off Checklist

Use this checklist during your test execution to track progress:

- [ ] **1. Authentication & Session Management**
  - [ ] TC-AUTH-01: Valid Admin login
  - [ ] TC-AUTH-02: Invalid password rejection
  - [ ] TC-AUTH-03: Unregistered email handling
  - [ ] TC-AUTH-04: User registration & workspace bootstrap
  - [ ] TC-AUTH-05: Password length validation
  - [ ] TC-AUTH-06: Session persistence & logout

- [ ] **2. Workspaces & Settings**
  - [ ] TC-WS-01: Create workspace & verify data isolation
  - [ ] TC-WS-02: Workspace switcher
  - [ ] TC-WS-03: Settings updates (currency, week start, default rate)
  - [ ] TC-WS-04: Non-admin protection from settings

- [ ] **3. Team & RBAC**
  - [ ] TC-TEAM-01: View team roster
  - [ ] TC-TEAM-02: Member email invitation & token generation
  - [ ] TC-TEAM-03: Acceptance of pending invitation
  - [ ] TC-TEAM-04: Member role & rate update
  - [ ] TC-TEAM-05: Workspace owner protection
  - [ ] TC-TEAM-06: Granular RBAC permissions

- [ ] **4. Clients**
  - [ ] TC-CLIENT-01: Client roster listing
  - [ ] TC-CLIENT-02: Create client
  - [ ] TC-CLIENT-03: Duplicate name validation
  - [ ] TC-CLIENT-04: Inline rename client
  - [ ] TC-CLIENT-05: Soft-archive and restore

- [ ] **5. Projects & Tasks**
  - [ ] TC-PROJ-01: Projects listing
  - [ ] TC-PROJ-02: Create public project with custom color & rate
  - [ ] TC-PROJ-03: Create private project
  - [ ] TC-PROJ-04: Private project access restrictions
  - [ ] TC-PROJ-05: Add project task
  - [ ] TC-PROJ-06: Complete & archive task
  - [ ] TC-PROJ-07: Archive project

- [ ] **6. Tags**
  - [ ] TC-TAG-01: Create tag
  - [ ] TC-TAG-02: Edit & archive tag

- [ ] **7. Time Tracker Engine**
  - [ ] TC-TIMER-01: Start & run live timer (persistent on reload)
  - [ ] TC-TIMER-02: Stop active timer
  - [ ] TC-TIMER-03: Discard running timer
  - [ ] TC-TIMER-04: Auto-stop previous timer on new timer start
  - [ ] TC-TIMER-05: Continue past entry (Play action)
  - [ ] TC-TIMER-06: Manual mode (Start & End time)
  - [ ] TC-TIMER-07: Manual mode (Duration in minutes)

- [ ] **8. Timesheet History & Inline Editing**
  - [ ] TC-TS-01: Daily grouping & sum accuracy
  - [ ] TC-TS-02: Inline edit description & billable toggle
  - [ ] TC-TS-03: Delete entry and recalculate daily total
  - [ ] TC-TS-04: Member data isolation

- [ ] **9. Weekly Timesheet Matrix**
  - [ ] TC-WEEK-01: 7-day grid rendering
  - [ ] TC-WEEK-02: Previous/Next week navigation
  - [ ] TC-WEEK-03: Add project/task row
  - [ ] TC-WEEK-04: Cell editing & dynamic sum recalculation

- [ ] **10. Reports & Analytics**
  - [ ] TC-REP-01: Summary metric cards (Hours, Billable vs Non-Billable, Revenue)
  - [ ] TC-REP-02: Visual charts (Bar & Donut)
  - [ ] TC-REP-03: Date presets (Today, Week, Month, Custom)
  - [ ] TC-REP-04: Multi-facet filters (Client, Project, Tag, Billability)
  - [ ] TC-REP-05: Member report scoping
  - [ ] TC-REP-06: RFC 4180 CSV Export

- [ ] **11. Rate Resolution Hierarchy**
  - [ ] TC-RATE-01: Project rate override
  - [ ] TC-RATE-02: Member rate override
  - [ ] TC-RATE-03: Workspace default rate
  - [ ] TC-RATE-04: Non-billable zero revenue

- [ ] **12. Edge Cases & Resilience**
  - [ ] TC-EDGE-01: Redis fallback to PostgreSQL
  - [ ] TC-EDGE-02: Midnight span duration calculation
  - [ ] TC-EDGE-03: Multi-tab timer synchronization
  - [ ] TC-EDGE-04: Clean empty states


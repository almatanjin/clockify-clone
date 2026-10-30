# Tasks

## 1. Project Initialization and Infrastructure

- [x] 1.1 Initialize Next.js 15 project with App Router, TypeScript, and Tailwind CSS; verify `npm run build` runs cleanly.
- [x] 1.2 Configure Docker Compose with PostgreSQL and Redis containers; verify service configurations with `docker compose config`.
- [x] 1.3 Define Prisma ORM schema for Users, Workspaces, WorkspaceMembers, Invitations, Clients, Projects, ProjectMembers, Tasks, Tags, and TimeEntries (including `TimeEntryTag` join relation and partial unique index for active timers); verify with `npx prisma validate` and `npx prisma generate`.
- [x] 1.4 Implement database seed script (`prisma/seed.ts`) with a demo workspace, sample clients, public/private projects, tags, and 30 days of historical time entries; verify `npx prisma db seed` populates the database cleanly.
- [x] 1.5 Implement Redis client connection and write-through cache helpers for active running timers with graceful PostgreSQL fallback; verify unit helper tests pass.

## 2. Authentication and Workspace Foundation

- [x] 2.1 Implement user registration, login (`bcryptjs`), timezone detection, and HTTP-only JWT session cookie management (`jose`); verify registration and authenticated session persistence.
- [x] 2.2 Implement workspace creation, workspace settings (currency, `defaultHourlyRate`, `weekStart`), and workspace context switcher; verify switching workspaces isolates data scoping.
- [x] 2.3 Implement team member invitations (with auto-linking on invite token/email registration) and role-based access control (`ADMIN`, `MANAGER`, `MEMBER`); verify permission checks restrict non-admins from workspace settings and enforce member-only scoping.

## 3. Projects, Clients, Tasks, and Tags Management

- [x] 3.1 Implement Client CRUD and soft-archiving (`isArchived`) API and management view; verify archived clients remain in historical logs but hide from active selectors.
- [x] 3.2 Implement Project creation and editing with color palette selection, client association, billable/hourly-rate overrides, public/private access (`ProjectMember` assignment), and soft-archiving; verify private projects are only visible to assigned members and admins/managers.
- [x] 3.3 Implement Project Task creation, status toggling (`ACTIVE` / `DONE`), and archiving; verify active tasks appear under parent projects in the time tracker.
- [x] 3.4 Implement Tag CRUD and soft-archiving within workspaces; verify users can attach multiple tags to time entries.

## 4. Time Tracking Engine

- [x] 4.1 Implement live interactive timer with start, stop, and discard actions syncing with PostgreSQL (`endTime: null`) and Redis; verify starting a new timer automatically stops any existing running timer and snapshots the applicable `hourlyRate`.
- [x] 4.2 Implement manual time entry mode with timezone-aware date picker, start/end time, and duration inputs; verify manual entry creates a valid record with calculated duration in integer seconds.
- [x] 4.3 Implement daily grouped timesheet list with timezone-accurate daily duration sums and a "Continue" (play) button on past entries; verify clicking "Continue" duplicates the entry's project, task, tags, and description into a new running timer.
- [x] 4.4 Implement inline editing (description, project, task, tags, timestamps, billable toggle) and deletion for existing time entry records; verify modifications recalculate durations/rates and update daily totals immediately.
- [x] 4.5 Implement weekly timesheet matrix view allowing users to log and edit hours across a 7-day grid grouped by Project/Task rows; verify grid totals match the daily timesheet list.

## 5. Reports and Analytics Dashboard

- [x] 5.1 Implement summary report dashboard with timezone-aware date range presets (Today, This Week, Last Week, This Month), total hours, billable revenue metrics, and Recharts visual charts for project/client/user distributions.
- [x] 5.2 Implement detailed report table with multi-filter support (date range, user, client, project, task, tag, billability) and role-based scoping (`MEMBER` restricted to own entries, `MANAGER`/`ADMIN` viewing all team entries); verify filtered view updates row counts, duration totals, and billable amounts.
- [x] 5.3 Implement CSV export functionality for filtered report datasets; verify downloaded CSV contains properly escaped fields for date, user, client, project, task, tags, description, start/end times, duration (seconds and `HH:MM:SS`), billable status, and billable amount.

## 6. End-to-End Verification and Polish

- [x] 6.1 Conduct full user workflow verification (User Registration -> Workspace & Rate Setup -> Client, Project, Task & Tag Setup -> Live & Manual Timer Logging -> Weekly Grid Entry -> Report Filtering -> CSV Export); verify all steps complete without errors.
- [x] 6.2 Review UI styling, dark/light theme consistency, responsive design across viewports, and empty-state messaging; verify polished Clockify-inspired visual aesthetics and keyboard navigation.
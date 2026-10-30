# Proposal

## Why

The company's commercial Clockify subscription license has expired, interrupting the team's daily time tracking, billing management, and client reporting workflows. Building a self-hosted, dedicated time tracking web application replicating Clockify's core capabilities will eliminate recurring licensing costs and provide full control over company data.

## What Changes

- Initialize a modern full-stack Next.js 15 web application with App Router, TypeScript, and Tailwind CSS.
- Introduce core time tracking capability with a live start/stop timer (auto-stopping concurrent timers and supporting quick continuation of past entries), manual duration entry, daily chronological timesheet list, and weekly timesheet grid views.
- Introduce projects, tasks, clients, and tags management hierarchy with custom color coding, soft archiving, private/public project access controls, and billability defaults with hourly rate overrides.
- Introduce multi-tenant workspaces and team member management with role-based access control (Admin, Manager, Member), timezone/week-start preferences, and invitation flows.
- Introduce summary and detailed reporting dashboards with role-scoped visibility, date range filtering, revenue/billable calculations, and CSV export capabilities.
- Integrate PostgreSQL with Prisma ORM for relational persistence (as the primary source of truth) and Redis for session management and real-time active timer read-caching.

## Capabilities

### New Capabilities
- `time-tracking`: Live interactive timer, auto-stop on new timer start, one-click timer continuation, manual time logging, entry editing with multi-tag support, daily grouped timesheet views, and weekly matrix timesheets.
- `projects-and-clients`: Management of clients, projects, tasks, and tags with custom colors, soft archiving (`isArchived`), public/private project access (`ProjectMember`), and cascading billable/hourly-rate defaults.
- `workspaces-and-teams`: Workspace isolation, timezone and currency settings, member invitation flows, and granular role-based permissions (`ADMIN`, `MANAGER`, `MEMBER`).
- `reports-and-analytics`: Summary aggregations, project/client/user breakdowns, billable revenue calculations, role-scoped filtering, and CSV report export.

### Modified Capabilities
<!-- None: Greenfield project -->

## Impact

- **Architecture**: New greenfield Next.js 15 application (App Router) with React Server Components, Server Actions, and Tailwind CSS.
- **Database**: PostgreSQL schema with Prisma ORM for Users, Workspaces, WorkspaceMembers, Invitations, Clients, Projects, ProjectMembers, Tasks, Tags, and TimeEntries.
- **Cache/In-Memory**: Redis connection for caching active running timers across tabs and managing user sessions.
- **Dependencies**: Next.js, React, Prisma, `@prisma/client`, `ioredis`, `jose` & `bcryptjs` (for session JWTs and password hashing), `lucide-react`, `date-fns`, ` `@date-fns/tz` ` (for timezone-accurate daily/weekly boundaries), `recharts` (for analytics visualization), `@radix-ui/*` primitives, and `zod` (for validation).
# Design

## Context

The workspace is a greenfield project replacing an expired commercial Clockify instance. The solution must provide complete ownership of data and replicate Clockify's foundational workflows for team time logging, project categorization, billable rate calculation, and reporting. See `proposal.md` for background and motivation.

## Goals / Non-Goals

**Goals:**
- Provide a responsive, high-performance Next.js 15 web application with a live start/stop timer, manual time logging, and both daily list and weekly grid timesheet views.
- Implement client, project, task, and tag hierarchies with color indicators, soft archiving, private project access lists, and cascading billability/hourly rates.
- Support multi-tenant workspace architecture with role-based member management (`ADMIN`, `MANAGER`, `MEMBER`), currency settings, and timezone-aware date boundaries.
- Deliver interactive analytics dashboards (summary distributions and detailed filtered timesheet tables) with billable revenue totals and CSV export.
- Use PostgreSQL (via Prisma ORM) for persistent relational storage and Redis for active timer read-through caching and session state.
- Provide a Docker Compose configuration for immediate self-hosted deployment of PostgreSQL and Redis.

**Non-Goals:**
- Mobile native apps with GPS tracking / geofencing.
- Automated employee surveillance, desktop screenshot capturing, or keystroke monitoring.
- Direct payment gateway integration (e.g., Stripe checkout) or external accounting software sync.

## Decisions

### 1. Framework: Next.js 15 (App Router) with React Server Components
- **Choice**: Next.js 15 App Router with TypeScript, React Server Components (RSC), and Server Actions for data mutations.
- **Rationale**: Combines server-side rendering for fast initial loads with Server Actions for streamlined, type-safe mutations without maintaining a separate backend repository.
- **Alternatives considered**:
  - *Separate Node/Express backend + React SPA*: Higher deployment and type-syncing friction.
  - *Next.js Pages Router*: Lacks streaming RSC benefits and built-in Server Actions.

### 2. Database & Data Modeling: PostgreSQL with Prisma ORM
- **Choice**: PostgreSQL managed via Prisma ORM schemas, migrations, and seed scripts.
- **Rationale**: Relational integrity is vital for timesheets, projects, clients, tags, and memberships.
- **Key Domain Rules**:
  - **Duration & Rates**: `TimeEntry.duration` is stored strictly in **integer seconds** (`null` while actively running). Hourly rates (`defaultHourlyRate`, `hourlyRate`) are stored in **integer cents** (e.g., `5000` = $50.00/hr) to prevent floating-point rounding errors.
  - **Rate Hierarchy & Snapshotting**: When a time entry is created or updated, its `hourlyRate` is resolved in order of precedence: `Project.hourlyRate` → `WorkspaceMember.hourlyRate` → `Workspace.defaultHourlyRate`. This resolved rate is snapshotted onto `TimeEntry.hourlyRate` so future rate changes do not alter historical billing reports.
  - **Soft Archiving**: `Client`, `Project`, `Task`, and `Tag` entities use `isArchived: Boolean` rather than hard deletion when referenced by historical time entries.

### 3. State Management for Active Timers: PostgreSQL Source of Truth + Redis Cache
- **Choice**: Persist active running timers immediately in PostgreSQL as a `TimeEntry` with `endTime: null` and `duration: null` (enforced by a partial unique index ensuring at most one running timer per `userId` + `workspaceId`), paired with a write-through Redis cache (`timer:{workspaceId}:{userId}`). Elapsed time on the client is calculated dynamically via `Date.now() - new Date(startTime).getTime()`.
- **Rationale**: Writing to PostgreSQL on timer start/stop only occurs twice per session (zero per-second DB write churn), guarantees durability if Redis restarts, and simplifies fallback logic. Redis provides sub-millisecond reads for layout headers and multi-tab state synchronization.
- **Alternatives considered**:
  - *Redis-only while running*: Requires dual persistence logic and risks losing active timer state if an unpersisted Redis container restarts.
  - *Client-side localStorage only*: Fails to sync across devices or browsers.

### 4. Workspace Multi-Tenancy, RBAC, and Timezones
- **Choice**: Every domain record strictly belongs to a `workspaceId`. Authentication uses HTTP-only signed JWT session cookies (`jose` + `bcryptjs`) storing `userId` and `activeWorkspaceId`.
- **Role Matrix**:
  - `ADMIN`: Full access to workspace settings, billing rates, member invitations, all projects, and all team reports.
  - `MANAGER`: Can create/archive clients, projects, tasks, and tags; can manage project members and view/export team-wide reports; cannot modify workspace-level settings or admin roles.
  - `MEMBER`: Can track time on public projects or assigned private projects (`ProjectMember`), manage their own time entries, and view/export reports scoped strictly to their own entries.
- **Timezones**: `User.timezone` (IANA format, e.g., `Asia/Dhaka`, `America/New_York`) and `Workspace.weekStart` (`MONDAY` | `SUNDAY`) govern all daily grouping and report date-range boundaries.

### 5. UI & Design System: Tailwind CSS & Radix UI
- **Choice**: Tailwind CSS with custom Clockify-inspired color accents (cyan/teal and slate dark/light themes), Lucide icons, and Radix UI primitives.
- **Rationale**: Clean, modern aesthetics with responsive layout, keyboard accessibility, and rapid component composition.

## Data Model Overview

```text
User (id, email, passwordHash, name, timezone, createdAt)
  └── WorkspaceMember (id, userId, workspaceId, role: ADMIN | MANAGER | MEMBER, hourlyRate?)
        └── Workspace (id, name, ownerId, currency, defaultHourlyRate, weekStart, createdAt)
              ├── Invitation (id, email, workspaceId, role, token, status, expiresAt)
              ├── Client (id, name, workspaceId, isArchived)
              ├── Project (id, name, color, clientId?, workspaceId, isBillable, hourlyRate?, isPublic, isArchived)
              │     ├── ProjectMember (id, projectId, userId)
              │     └── Task (id, name, projectId, status: ACTIVE | DONE, isArchived)
              ├── Tag (id, name, workspaceId, isArchived)
              └── TimeEntry (id, workspaceId, userId, projectId?, taskId?, description, startTime, endTime?, duration?, isBillable, hourlyRate)
                    └── TimeEntryTag (timeEntryId, tagId)
```
## Risks / Trade-offs
[Risk: Browser tab throttling causes timer visual drift]
→ Mitigation: Client components render elapsed time derived dynamically from Date.now() - new Date(startTime).getTime(), never relying on naive setInterval(count++).

[Risk: Timezone boundary mismatches in daily timesheets and reports]
→ Mitigation: Store all timestamps in UTC (TIMESTAMPTZ) in PostgreSQL, and convert start/end-of-day filter bounds using @date-fns/tz with the user's configured IANA timezone.

[Risk: Accidental cross-workspace or unauthorized private project access]
→ Mitigation: Centralized repository/service layer enforcing where: { workspaceId: session.activeWorkspaceId } and verifying Project.isPublic || ProjectMember membership on all queries.

[Risk: Self-hosted Redis unavailability]
→ Mitigation: Because active timers are written to PostgreSQL (endTime: null) on start, any Redis cache miss or connection error transparently falls back to querying PostgreSQL.
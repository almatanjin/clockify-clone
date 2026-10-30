# Spec Delta

## Purpose

Provides multi-tenant workspace isolation, workspace-level billing/localization defaults, member invitations, and three-tier role-based access control (`ADMIN`, `MANAGER`, `MEMBER`).

## ADDED Requirements

### Requirement: Workspace Data Isolation and Localization
The system SHALL isolate all projects, clients, tags, time entries, and configurations strictly within user-selected workspaces, respecting workspace currency, default hourly rate, and start-of-week preferences.

#### Scenario: Workspace switching
- **WHEN** user selects an alternate workspace from the workspace switcher
- **THEN** system updates the active session scope and displays only records, timers, and permissions belonging to the selected workspace

#### Scenario: Configure workspace billing and calendar defaults
- **WHEN** workspace administrator updates the workspace currency, `defaultHourlyRate`, or `weekStart` day
- **THEN** system applies the updated currency and week boundary across timesheets and uses the new default rate for future time entries lacking project/member overrides

### Requirement: Member Invitation and Roster Management
The system SHALL allow workspace administrators to invite new users by email address, set member-specific hourly rates, and manage existing roster entries.

#### Scenario: Invite team member
- **WHEN** administrator enters a user email, selects a role (`ADMIN`, `MANAGER`, or `MEMBER`), and sends an invitation
- **THEN** system creates a pending `Invitation` record with an invite link/token and automatically binds the user to the workspace upon registration or login

### Requirement: Role-Based Authorization
The system SHALL enforce granular permissions across three roles: `ADMIN`, `MANAGER`, and `MEMBER`.

#### Scenario: Member restricted from management and other users' data
- **WHEN** a user with `MEMBER` role attempts to modify workspace settings, create projects, or view another member's time logs
- **THEN** system forbids the operation and restricts access strictly to the member's own time entries and assigned/public projects

#### Scenario: Manager manages projects and views team reports
- **WHEN** a user with `MANAGER` role creates/edits projects, clients, tasks, or views team-wide reports
- **THEN** system permits the project and reporting actions while blocking access to workspace-level billing settings and admin role assignments

#### Scenario: Admin manages workspace settings and roles
- **WHEN** a user with `ADMIN` role updates workspace preferences, default rates, or member roles
- **THEN** system applies and persists the changes immediately
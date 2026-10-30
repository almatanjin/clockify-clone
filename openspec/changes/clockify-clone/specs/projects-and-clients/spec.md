# Spec Delta

## Purpose

Allows teams to organize time entries into clients, projects, discrete tasks, and tags with custom colors, visibility controls, soft archiving, and cascading billability/rate settings.

## ADDED Requirements

### Requirement: Client Management and Archiving
The system SHALL allow workspace administrators and managers to create, update, and soft-archive client entities for grouping projects.

#### Scenario: Create new client
- **WHEN** admin or manager submits a unique client name within the workspace
- **THEN** system registers the client and makes it selectable during project creation

#### Scenario: Archive existing client
- **WHEN** admin or manager archives a client
- **THEN** system hides the client from active creation dropdowns while preserving its association on historical projects and reports

### Requirement: Project Creation, Visibility, and Rate Configuration
The system SHALL support creating projects with custom color identifiers, optional client associations, public/private visibility controls, and billable/hourly-rate overrides.

#### Scenario: Create new project
- **WHEN** admin or manager submits a project name, selects a color code, sets visibility (`isPublic`), configures default billability and optional `hourlyRate`, and links an optional client
- **THEN** system persists the project and makes it available to authorized workspace members

#### Scenario: Restrict private project access
- **WHEN** a project is configured with `isPublic: false` and assigned specific `ProjectMember` users
- **THEN** only workspace Admins, Managers, and explicitly assigned ProjectMembers can view or log time against the project

#### Scenario: Archive completed project
- **WHEN** admin or manager archives a project (`isArchived: true`)
- **THEN** system prevents new time entries from being logged to the project while retaining all historical entries in reports

### Requirement: Granular Project Tasks
The system SHALL allow defining specific tasks under a project and toggling their completion status (`ACTIVE` or `DONE`).

#### Scenario: Add task to project
- **WHEN** admin or manager creates a task under an existing project
- **THEN** system allows authorized team members to select this task when recording time entries for that project

#### Scenario: Mark task as done
- **WHEN** admin or manager marks a project task as `DONE` or archived
- **THEN** system removes the task from active timer dropdowns while preserving historical task reporting

### Requirement: Multi-Tag Categorization
The system SHALL allow workspaces to define reusable tags that can be attached to any time entry across projects.

#### Scenario: Create and assign tags
- **WHEN** a user creates or selects one or more workspace tags (e.g., `bugfix`, `meeting`, `urgent`) on a time entry
- **THEN** system associates those tags with the time entry for cross-project filtering in reports

### Requirement: Project Billability and Rate Inheritance
The system SHALL cascade project default billability settings and hourly rate hierarchy (`Project` → `WorkspaceMember` → `Workspace`) to newly initiated time entries.

#### Scenario: Project billable default and rate applied
- **WHEN** user selects a project configured as billable with a custom project hourly rate in the time tracker
- **THEN** system marks the time entry as billable by default and snapshots the project's hourly rate onto the entry
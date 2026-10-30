# Spec Delta

## Purpose

Aggregates logged time entries into analytical charts, billable revenue summaries, and detailed filterable timesheets with CSV export.

## ADDED Requirements

### Requirement: Summary Dashboard Analytics and Revenue Calculation
The system SHALL aggregate logged hours and billable revenue (`(duration / 3600) * (hourlyRate / 100)`) into graphical charts and breakdown summaries categorized by project, client, task, or user.

#### Scenario: View summary analytics
- **WHEN** user selects a date range preset (such as Today, This Week, Last Week, or This Month) in their local timezone
- **THEN** system renders visual charts and summary metrics showing total hours, billable vs. non-billable hours, total billable revenue in workspace currency, and project distributions

### Requirement: Detailed Timesheet Filtering and Role Scoping
The system SHALL provide interactive filtering of individual time entry logs across date spans, users, clients, projects, tasks, tags, and billable status, scoped by the requester's workspace role.

#### Scenario: Admin or Manager filters team timesheet records
- **WHEN** an Admin or Manager applies filters for a specific team member, client, tag, and billable-only status
- **THEN** system presents the matching entries across the team along with updated cumulative duration and billable amount totals

#### Scenario: Member views reports scoped to own entries
- **WHEN** a user with `MEMBER` role opens Summary or Detailed reports
- **THEN** system automatically restricts all queries and user filters to display only that member's own logged time entries

### Requirement: Report Exporting
The system SHALL support exporting filtered report datasets into structured downloadable CSV files.

#### Scenario: Download CSV report
- **WHEN** user requests a CSV export on an active filtered report view
- **THEN** system delivers a properly escaped RFC 4180 CSV file containing date, user, client, project, task, tags, description, start time, end time, duration (formatted and in seconds), billable flag, hourly rate, and billable amount
# Spec Delta

## Purpose

Provides real-time and manual tracking of working hours with task descriptions, project associations, multi-tag categorization, hourly rate snapshotting, and daily/weekly timesheet views.

## ADDED Requirements

### Requirement: Live Timer Tracking and Auto-Stop
The system SHALL allow authenticated users to start, run, stop, and discard a real-time timer, ensuring at most one timer runs per user within a workspace at any given time.

#### Scenario: Start live timer
- **WHEN** user provides an optional description, project, task, or tags and clicks Start Timer
- **THEN** system creates an active time entry (`endTime: null`), caches it in Redis, and displays the live elapsed counter derived from the start timestamp

#### Scenario: Auto-stop existing running timer when starting a new timer
- **WHEN** user starts a new timer while another timer is already running in the same workspace
- **THEN** system automatically stops the previously running timer at the current timestamp, calculates its duration in seconds, and starts the new timer

#### Scenario: Stop active timer
- **WHEN** user clicks Stop Timer on an active running timer
- **THEN** system commits the entry's `endTime` and calculated `duration` in seconds, clears the active Redis cache key, and prepends the completed entry to the timesheet

#### Scenario: Discard active timer
- **WHEN** user clicks Discard on an active running timer
- **THEN** system deletes the uncommitted running entry from storage and resets the timer bar without logging time

### Requirement: Continue Past Time Entry
The system SHALL allow users to resume work on a previously logged task with a single action.

#### Scenario: Click Continue on an existing time entry
- **WHEN** user clicks the Continue (Play) action on a completed timesheet entry
- **THEN** system starts a new live timer pre-populated with that entry's description, project, task, tags, and billable status

### Requirement: Manual Time Entry and Weekly Grid Logging
The system SHALL allow authenticated users to manually log completed time intervals via a manual entry mode or a 7-day weekly timesheet matrix.

#### Scenario: Create manual time entry
- **WHEN** user switches to Manual mode, enters a description, selects a project/task, inputs a date with start and end times (or duration), and submits
- **THEN** system creates a completed time entry under the specified date with resolved billable rate and integer second duration

#### Scenario: Log time in weekly timesheet grid
- **WHEN** user selects a Project/Task row in the Weekly Timesheet view and enters a duration for a specific day cell
- **THEN** system creates or updates the corresponding time entry for that date and recalculates row, column, and weekly totals

### Requirement: Time Entry Modification and Deletion
The system SHALL allow users to modify entry descriptions, timestamps, project/task associations, multiple tags, and billable status, or delete entries.

#### Scenario: Edit past entry
- **WHEN** user modifies the description, project, tags, or time bounds of an existing entry
- **THEN** system persists the updated fields, recalculates duration and applicable hourly rate, and updates daily totals immediately

#### Scenario: Delete time entry
- **WHEN** user initiates deletion of an entry
- **THEN** system removes the entry from the timesheet and subtracts its duration and billable amount from daily totals

### Requirement: Timezone-Aware Timesheet Daily Grouping
The system SHALL present time entries grouped by calendar day according to the user's configured timezone and display cumulative daily and weekly worked hours.

#### Scenario: Display timesheet summary
- **WHEN** user views the time tracker page
- **THEN** entries are grouped by local calendar date in reverse chronological order with accurate daily and weekly duration totals formatted as `HH:MM:SS`
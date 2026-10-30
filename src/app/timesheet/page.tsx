import { AppShell } from '@/components/layout/AppShell';
import { WeeklyGridView } from '@/components/timesheet/WeeklyGridView';
import { getWeeklyGridDataAction } from '@/app/actions/timesheet';
import { getProjectsAction } from '@/app/actions/projects';
import { getWorkspaceContextData } from '@/app/actions/workspace';
import { WeekStart } from '@prisma/client';

interface TimesheetPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function TimesheetPage({ searchParams }: TimesheetPageProps) {
  const params = await searchParams;
  const context = await getWorkspaceContextData();
  const { workspace } = context;

  // Determine Week Start Date
  const targetDate = params.date ? new Date(params.date) : new Date();
  const weekStartPref = workspace?.weekStart || WeekStart.MONDAY;

  const currentDayOfWeek = targetDate.getDay(); // 0 is Sunday, 1 is Monday
  let dayOffset = 0;

  if (weekStartPref === WeekStart.MONDAY) {
    // Distance from Monday (1)
    dayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  } else {
    // Distance from Sunday (0)
    dayOffset = currentDayOfWeek;
  }

  const weekStartDate = new Date(targetDate);
  weekStartDate.setDate(targetDate.getDate() - dayOffset);
  const weekStartISO = weekStartDate.toISOString().split('T')[0];

  const [gridData, projects] = await Promise.all([
    getWeeklyGridDataAction(weekStartISO),
    getProjectsAction(false),
  ]);

  const formattedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    tasks: p.tasks.map((t) => ({ id: t.id, name: t.name })),
  }));

  return (
    <AppShell>
      <WeeklyGridView
        initialData={gridData}
        projects={formattedProjects}
        currentWeekStart={weekStartISO}
      />
    </AppShell>
  );
}

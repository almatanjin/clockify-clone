import { AppShell } from '@/components/layout/AppShell';
import { TimerBar } from '@/components/tracker/TimerBar';
import { TimesheetList } from '@/components/tracker/TimesheetList';
import { getCurrentActiveTimer, getTimesheetEntriesAction } from '@/app/actions/timer';
import { getProjectsAction } from '@/app/actions/projects';
import { getTagsAction } from '@/app/actions/tags';
import { requireAuthSession } from '@/app/actions/workspace';
import { prisma } from '@/lib/prisma';

export default async function TrackerPage() {
  const session = await requireAuthSession();

  const [workspace, activeTimer, timesheetEntries, projects, tags] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: session.activeWorkspaceId },
      select: { currency: true },
    }),
    getCurrentActiveTimer(),
    getTimesheetEntriesAction(100),
    getProjectsAction(false), // only active projects
    getTagsAction(false), // only active tags
  ]);

  const currency = workspace?.currency || 'USD';

  const formattedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    isBillable: p.isBillable,
    tasks: p.tasks.map((t) => ({ id: t.id, name: t.name })),
  }));

  const formattedTags = tags.map((t) => ({
    id: t.id,
    name: t.name,
  }));

  return (
    <AppShell>
      <div className="space-y-8">
        <TimerBar
          initialActiveTimer={activeTimer}
          projects={formattedProjects}
          tags={formattedTags}
          currency={currency}
        />

        <div>
          <TimesheetList
            entries={timesheetEntries}
            userTimezone={session.timezone}
            currency={currency}
          />
        </div>
      </div>
    </AppShell>
  );
}

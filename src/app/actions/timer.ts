'use server';

import { prisma } from '@/lib/prisma';
import { requireAuthSession } from './workspace';
import { setActiveTimer, clearActiveTimer, getActiveTimer } from '@/lib/active-timer';
import { revalidatePath } from 'next/cache';

async function resolveHourlyRate(
  workspaceId: string,
  userId: string,
  projectId?: string | null
): Promise<number> {
  // 1. Project rate override
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { hourlyRate: true },
    });
    if (project?.hourlyRate && project.hourlyRate > 0) {
      return project.hourlyRate;
    }
  }

  // 2. Member rate override
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { hourlyRate: true },
  });
  if (member?.hourlyRate && member.hourlyRate > 0) {
    return member.hourlyRate;
  }

  // 3. Workspace default rate
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { defaultHourlyRate: true },
  });
  return workspace?.defaultHourlyRate ?? 0;
}

export async function getCurrentActiveTimer() {
  const session = await requireAuthSession();
  return getActiveTimer(session.activeWorkspaceId, session.userId);
}

export async function startTimerAction(formData: FormData) {
  const session = await requireAuthSession();
  const description = formData.get('description')?.toString() || '';
  const projectId = formData.get('projectId')?.toString() || null;
  const taskId = formData.get('taskId')?.toString() || null;
  const tagIds = formData.getAll('tagIds') as string[];
  const isBillableExplicit = formData.get('isBillable');

  // Auto-stop any existing running timer for this user in this workspace
  const runningEntry = await prisma.timeEntry.findFirst({
    where: {
      workspaceId: session.activeWorkspaceId,
      userId: session.userId,
      endTime: null,
    },
  });

  const now = new Date();

  if (runningEntry) {
    const elapsedSeconds = Math.max(1, Math.round((now.getTime() - runningEntry.startTime.getTime()) / 1000));
    await prisma.timeEntry.update({
      where: { id: runningEntry.id },
      data: {
        endTime: now,
        duration: elapsedSeconds,
      },
    });
  }

  // Verify project access and resolve billability
  let isBillable = isBillableExplicit === 'true';
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId, workspaceId: session.activeWorkspaceId },
      include: { members: true },
    });
    if (!project) return { error: 'Project not found.' };

    if (!project.isPublic && session.role !== 'ADMIN') {
      const isAssigned = project.members.some((m) => m.userId === session.userId);
      if (!isAssigned) {
        return { error: 'You are not assigned to this private project.' };
      }
    }

    if (isBillableExplicit === null) {
      isBillable = project.isBillable;
    }
  }

  const hourlyRate = await resolveHourlyRate(session.activeWorkspaceId, session.userId, projectId);

  // Create new active TimeEntry (endTime: null)
  const newEntry = await prisma.timeEntry.create({
    data: {
      workspaceId: session.activeWorkspaceId,
      userId: session.userId,
      projectId: projectId || null,
      taskId: taskId || null,
      description,
      startTime: now,
      endTime: null,
      duration: null,
      isBillable,
      hourlyRate,
      tags:
        tagIds.length > 0
          ? {
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
    },
    include: {
      project: true,
      task: true,
      tags: { include: { tag: true } },
    },
  });

  // Write-through to Redis
  await setActiveTimer({
    id: newEntry.id,
    workspaceId: newEntry.workspaceId,
    userId: newEntry.userId,
    projectId: newEntry.projectId,
    projectName: newEntry.project?.name,
    projectColor: newEntry.project?.color,
    taskId: newEntry.taskId,
    taskName: newEntry.task?.name,
    description: newEntry.description,
    startTime: newEntry.startTime.toISOString(),
    isBillable: newEntry.isBillable,
    hourlyRate: newEntry.hourlyRate,
    tags: newEntry.tags.map((t) => t.tag.name),
  });

  revalidatePath('/tracker');
  revalidatePath('/timesheet');
  return { success: true, timer: newEntry };
}

export async function stopTimerAction() {
  const session = await requireAuthSession();

  const runningEntry = await prisma.timeEntry.findFirst({
    where: {
      workspaceId: session.activeWorkspaceId,
      userId: session.userId,
      endTime: null,
    },
  });

  if (!runningEntry) {
    await clearActiveTimer(session.activeWorkspaceId, session.userId);
    return { success: true };
  }

  const now = new Date();
  const durationSeconds = Math.max(1, Math.round((now.getTime() - runningEntry.startTime.getTime()) / 1000));

  await prisma.timeEntry.update({
    where: { id: runningEntry.id },
    data: {
      endTime: now,
      duration: durationSeconds,
    },
  });

  await clearActiveTimer(session.activeWorkspaceId, session.userId);

  revalidatePath('/tracker');
  revalidatePath('/timesheet');
  revalidatePath('/reports');
  return { success: true };
}

export async function discardTimerAction() {
  const session = await requireAuthSession();

  await prisma.timeEntry.deleteMany({
    where: {
      workspaceId: session.activeWorkspaceId,
      userId: session.userId,
      endTime: null,
    },
  });

  await clearActiveTimer(session.activeWorkspaceId, session.userId);

  revalidatePath('/tracker');
  revalidatePath('/timesheet');
  return { success: true };
}

export async function continueEntryAction(entryId: string) {
  const session = await requireAuthSession();

  const pastEntry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
    include: { tags: true },
  });

  if (!pastEntry) return { error: 'Entry not found.' };

  const formData = new FormData();
  formData.set('description', pastEntry.description);
  if (pastEntry.projectId) formData.set('projectId', pastEntry.projectId);
  if (pastEntry.taskId) formData.set('taskId', pastEntry.taskId);
  formData.set('isBillable', pastEntry.isBillable ? 'true' : 'false');
  pastEntry.tags.forEach((t) => formData.append('tagIds', t.tagId));

  return startTimerAction(formData);
}

export async function createManualEntryAction(formData: FormData) {
  const session = await requireAuthSession();
  const description = formData.get('description')?.toString() || '';
  const projectId = formData.get('projectId')?.toString() || null;
  const taskId = formData.get('taskId')?.toString() || null;
  const tagIds = formData.getAll('tagIds') as string[];
  const dateStr = formData.get('date')?.toString(); // YYYY-MM-DD
  const startTimeStr = formData.get('startTime')?.toString(); // HH:MM
  const endTimeStr = formData.get('endTime')?.toString(); // HH:MM
  const durationMinutesStr = formData.get('durationMinutes')?.toString();
  const isBillable = formData.get('isBillable') === 'true';

  if (!dateStr) return { error: 'Date is required.' };

  let startTime: Date;
  let endTime: Date;
  let durationSeconds: number;

  if (startTimeStr && endTimeStr) {
    startTime = new Date(`${dateStr}T${startTimeStr}:00`);
    endTime = new Date(`${dateStr}T${endTimeStr}:00`);
    if (endTime <= startTime) {
      // Handles past midnight or error
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    }
    durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  } else if (durationMinutesStr) {
    const mins = Math.max(1, Number(durationMinutesStr));
    durationSeconds = mins * 60;
    startTime = new Date(`${dateStr}T09:00:00`);
    endTime = new Date(startTime.getTime() + durationSeconds * 1000);
  } else {
    return { error: 'Please provide either start/end times or total duration.' };
  }

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId, workspaceId: session.activeWorkspaceId },
      include: { members: true },
    });
    if (!project) return { error: 'Project not found.' };

    if (!project.isPublic && session.role !== 'ADMIN') {
      const isAssigned = project.members.some((m) => m.userId === session.userId);
      if (!isAssigned) {
        return { error: 'You are not assigned to this private project.' };
      }
    }
  }

  const hourlyRate = await resolveHourlyRate(session.activeWorkspaceId, session.userId, projectId);

  await prisma.timeEntry.create({
    data: {
      workspaceId: session.activeWorkspaceId,
      userId: session.userId,
      projectId: projectId || null,
      taskId: taskId || null,
      description,
      startTime,
      endTime,
      duration: durationSeconds,
      isBillable,
      hourlyRate,
      tags:
        tagIds.length > 0
          ? {
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
    },
  });

  revalidatePath('/tracker');
  revalidatePath('/timesheet');
  revalidatePath('/reports');
  return { success: true };
}

export async function updateTimeEntryAction(formData: FormData) {
  const session = await requireAuthSession();
  const entryId = formData.get('id')?.toString();
  const description = formData.get('description')?.toString() || '';
  const projectId = formData.get('projectId')?.toString() || null;
  const taskId = formData.get('taskId')?.toString() || null;
  const isBillable = formData.get('isBillable') === 'true';
  const tagIds = formData.getAll('tagIds') as string[];
  const startTimeISO = formData.get('startTime')?.toString();
  const endTimeISO = formData.get('endTime')?.toString();

  if (!entryId) return { error: 'Entry ID is required.' };

  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId, workspaceId: session.activeWorkspaceId },
  });

  if (!entry) return { error: 'Entry not found.' };

  // Members can only edit their own entries
  if (session.role === 'MEMBER' && entry.userId !== session.userId) {
    return { error: 'Permission denied.' };
  }

  let startTime = entry.startTime;
  let endTime = entry.endTime;
  let duration = entry.duration;

  if (startTimeISO) startTime = new Date(startTimeISO);
  if (endTimeISO) endTime = new Date(endTimeISO);

  if (startTime && endTime) {
    duration = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));
  }

  const hourlyRate = await resolveHourlyRate(session.activeWorkspaceId, entry.userId, projectId);

  await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      description,
      projectId: projectId || null,
      taskId: taskId || null,
      isBillable,
      startTime,
      endTime,
      duration,
      hourlyRate,
    },
  });

  // Update tags if provided
  if (tagIds.length > 0) {
    await prisma.timeEntryTag.deleteMany({ where: { timeEntryId: entryId } });
    await prisma.timeEntryTag.createMany({
      data: tagIds.map((tagId) => ({
        timeEntryId: entryId,
        tagId,
      })),
    });
  }

  revalidatePath('/tracker');
  revalidatePath('/timesheet');
  revalidatePath('/reports');
  return { success: true };
}

export async function deleteTimeEntryAction(entryId: string) {
  const session = await requireAuthSession();

  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId, workspaceId: session.activeWorkspaceId },
  });

  if (!entry) return { error: 'Entry not found.' };

  if (session.role === 'MEMBER' && entry.userId !== session.userId) {
    return { error: 'Permission denied.' };
  }

  await prisma.timeEntry.delete({
    where: { id: entryId },
  });

  revalidatePath('/tracker');
  revalidatePath('/timesheet');
  revalidatePath('/reports');
  return { success: true };
}

export async function getTimesheetEntriesAction(limit = 100) {
  const session = await requireAuthSession();

  return prisma.timeEntry.findMany({
    where: {
      workspaceId: session.activeWorkspaceId,
      userId: session.userId,
      endTime: { not: null }, // completed entries
    },
    include: {
      project: {
        include: {
          client: true,
        },
      },
      task: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: {
      startTime: 'desc',
    },
    take: limit,
  });
}

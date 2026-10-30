'use server';

import { prisma } from '@/lib/prisma';
import { requireAuthSession } from './workspace';
import { revalidatePath } from 'next/cache';

export async function getWeeklyGridDataAction(weekStartISO: string) {
  const session = await requireAuthSession();
  const startDate = new Date(weekStartISO);
  startDate.setHours(0, 0, 0, 0);

  const days: Array<{ dateStr: string; label: string; dayName: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = d.toLocaleDateString('en-CA');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({ dateStr, label, dayName });
  }

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);

  // Fetch entries for the 7 days
  const entries = await prisma.timeEntry.findMany({
    where: {
      workspaceId: session.activeWorkspaceId,
      userId: session.userId,
      startTime: {
        gte: startDate,
        lt: endDate,
      },
      endTime: { not: null },
    },
    include: {
      project: {
        include: {
          client: true,
        },
      },
      task: true,
    },
  });

  // Group by (projectId, taskId)
  interface RowData {
    key: string;
    projectId: string | null;
    projectName: string;
    projectColor: string;
    clientName: string | null;
    taskId: string | null;
    taskName: string | null;
    cellDurations: Record<string, number>; // dateStr -> seconds
    totalDuration: number;
  }

  const rowsMap: Record<string, RowData> = {};

  entries.forEach((entry) => {
    const pId = entry.projectId || 'none';
    const tId = entry.taskId || 'none';
    const rowKey = `${pId}:${tId}`;

    if (!rowsMap[rowKey]) {
      rowsMap[rowKey] = {
        key: rowKey,
        projectId: entry.projectId,
        projectName: entry.project?.name || 'No Project',
        projectColor: entry.project?.color || '#64748B',
        clientName: entry.project?.client?.name || null,
        taskId: entry.taskId,
        taskName: entry.task?.name || null,
        cellDurations: {},
        totalDuration: 0,
      };
      days.forEach((day) => {
        rowsMap[rowKey].cellDurations[day.dateStr] = 0;
      });
    }

    const dStr = new Date(entry.startTime).toLocaleDateString('en-CA');
    const dur = entry.duration || 0;
    rowsMap[rowKey].cellDurations[dStr] = (rowsMap[rowKey].cellDurations[dStr] || 0) + dur;
    rowsMap[rowKey].totalDuration += dur;
  });

  // Column totals
  const columnTotals: Record<string, number> = {};
  let grandTotal = 0;
  days.forEach((day) => {
    let dayTotal = 0;
    Object.values(rowsMap).forEach((r) => {
      dayTotal += r.cellDurations[day.dateStr] || 0;
    });
    columnTotals[day.dateStr] = dayTotal;
    grandTotal += dayTotal;
  });

  return {
    days,
    rows: Object.values(rowsMap),
    columnTotals,
    grandTotal,
  };
}

export async function updateWeeklyCellAction(
  projectId: string | null,
  taskId: string | null,
  dateStr: string,
  hours: number
) {
  const session = await requireAuthSession();
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59`);

  const existingEntry = await prisma.timeEntry.findFirst({
    where: {
      workspaceId: session.activeWorkspaceId,
      userId: session.userId,
      projectId: projectId || null,
      taskId: taskId || null,
      startTime: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  const durationSeconds = Math.round(hours * 3600);

  if (durationSeconds <= 0) {
    if (existingEntry) {
      await prisma.timeEntry.delete({ where: { id: existingEntry.id } });
    }
  } else {
    if (existingEntry) {
      await prisma.timeEntry.update({
        where: { id: existingEntry.id },
        data: {
          duration: durationSeconds,
          endTime: new Date(existingEntry.startTime.getTime() + durationSeconds * 1000),
        },
      });
    } else {
      const startTime = new Date(`${dateStr}T09:00:00`);
      const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

      // Check project billability & privacy
      let isBillable = false;
      let hourlyRate = 0;
      if (projectId) {
        const proj = await prisma.project.findUnique({
          where: { id: projectId, workspaceId: session.activeWorkspaceId },
          include: { members: true },
        });
        if (proj) {
          if (!proj.isPublic && session.role !== 'ADMIN') {
            const isAssigned = proj.members.some((m) => m.userId === session.userId);
            if (!isAssigned) return { error: 'You are not assigned to this private project.' };
          }
          isBillable = proj.isBillable;
          hourlyRate = proj.hourlyRate || 0;
        }
      }

      await prisma.timeEntry.create({
        data: {
          workspaceId: session.activeWorkspaceId,
          userId: session.userId,
          projectId: projectId || null,
          taskId: taskId || null,
          description: 'Logged via Weekly Timesheet',
          startTime,
          endTime,
          duration: durationSeconds,
          isBillable,
          hourlyRate,
        },
      });
    }
  }

  revalidatePath('/timesheet');
  revalidatePath('/tracker');
  revalidatePath('/reports');
  return { success: true };
}

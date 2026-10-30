'use server';

import { prisma } from '@/lib/prisma';
import { requireAuthSession } from './workspace';
import { WorkspaceRole, TaskStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getProjectsAction(includeArchived = false) {
  const session = await requireAuthSession();
  const isAdmin = session.role === WorkspaceRole.ADMIN;

  return prisma.project.findMany({
    where: {
      workspaceId: session.activeWorkspaceId,
      ...(includeArchived ? {} : { isArchived: false }),
      ...(!isAdmin
        ? {
            OR: [
              { isPublic: true },
              { members: { some: { userId: session.userId } } },
            ],
          }
        : {}),
    },
    include: {
      client: true,
      tasks: {
        where: includeArchived ? {} : { isArchived: false },
        orderBy: { name: 'asc' },
      },
      members: {
        include: {
          user: true,
        },
      },
      _count: {
        select: { timeEntries: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createProjectAction(formData: FormData) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Only administrators and managers can create projects.' };
  }

  const name = formData.get('name')?.toString().trim();
  const color = formData.get('color')?.toString().trim() || '#06B6D4';
  const clientId = formData.get('clientId')?.toString() || null;
  const isBillable = formData.get('isBillable') === 'true';
  const isPublic = formData.get('isPublic') !== 'false';
  const hourlyRateDollars = Number(formData.get('hourlyRate') || 0);
  const hourlyRate = hourlyRateDollars > 0 ? Math.round(hourlyRateDollars * 100) : null;
  const memberUserIds = formData.getAll('memberUserIds') as string[];

  if (!name) return { error: 'Project name is required.' };

  try {
    const project = await prisma.project.create({
      data: {
        name,
        color,
        clientId: clientId ? clientId : null,
        workspaceId: session.activeWorkspaceId,
        isBillable,
        hourlyRate,
        isPublic,
        members:
          !isPublic && memberUserIds.length > 0
            ? {
                create: memberUserIds.map((userId) => ({
                  userId,
                })),
              }
            : undefined,
      },
    });

    revalidatePath('/projects');
    revalidatePath('/tracker');
    return { success: true, project };
  } catch (err) {
    console.error('Create project error:', err);
    return { error: 'Failed to create project.' };
  }
}

export async function updateProjectAction(formData: FormData) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Only administrators and managers can update projects.' };
  }

  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString().trim();
  const color = formData.get('color')?.toString().trim() || '#06B6D4';
  const clientId = formData.get('clientId')?.toString() || null;
  const isBillable = formData.get('isBillable') === 'true';
  const isPublic = formData.get('isPublic') !== 'false';
  const hourlyRateDollars = Number(formData.get('hourlyRate') || 0);
  const hourlyRate = hourlyRateDollars > 0 ? Math.round(hourlyRateDollars * 100) : null;
  const memberUserIds = formData.getAll('memberUserIds') as string[];

  if (!id || !name) return { error: 'Project ID and name are required.' };

  try {
    const existing = await prisma.project.findUnique({
      where: { id, workspaceId: session.activeWorkspaceId },
      include: { members: true },
    });
    if (!existing) return { error: 'Project not found.' };

    if (!existing.isPublic && session.role !== WorkspaceRole.ADMIN) {
      const isAssigned = existing.members.some((m) => m.userId === session.userId);
      if (!isAssigned) {
        return { error: 'Permission denied to edit this private project.' };
      }
    }

    // Update base project details
    await prisma.project.update({
      where: { id, workspaceId: session.activeWorkspaceId },
      data: {
        name,
        color,
        clientId: clientId ? clientId : null,
        isBillable,
        hourlyRate,
        isPublic,
      },
    });

    // Update ProjectMembers if private
    await prisma.projectMember.deleteMany({ where: { projectId: id } });
    if (!isPublic && memberUserIds.length > 0) {
      await prisma.projectMember.createMany({
        data: memberUserIds.map((userId) => ({
          projectId: id,
          userId,
        })),
      });
    }

    revalidatePath('/projects');
    revalidatePath('/tracker');
    return { success: true };
  } catch (err) {
    console.error('Update project error:', err);
    return { error: 'Failed to update project.' };
  }
}

export async function toggleArchiveProjectAction(projectId: string) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Permission denied.' };
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId, workspaceId: session.activeWorkspaceId },
    });
    if (!project) return { error: 'Project not found.' };

    await prisma.project.update({
      where: { id: projectId },
      data: { isArchived: !project.isArchived },
    });

    revalidatePath('/projects');
    revalidatePath('/tracker');
    return { success: true };
  } catch (err) {
    console.error('Archive project error:', err);
    return { error: 'Failed to toggle project archive status.' };
  }
}

// -----------------------------------------------------------------------------
// Tasks Management
// -----------------------------------------------------------------------------

export async function createTaskAction(projectId: string, name: string) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Only administrators and managers can create tasks.' };
  }

  const trimmed = name.trim();
  if (!trimmed) return { error: 'Task name is required.' };

  try {
    // Verify project belongs to active workspace and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId, workspaceId: session.activeWorkspaceId },
      include: { members: true },
    });
    if (!project) return { error: 'Project not found in workspace.' };

    if (!project.isPublic && session.role !== WorkspaceRole.ADMIN) {
      const isAssigned = project.members.some((m) => m.userId === session.userId);
      if (!isAssigned) {
        return { error: 'Permission denied for this private project.' };
      }
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        name: trimmed,
        status: TaskStatus.ACTIVE,
      },
    });

    revalidatePath('/projects');
    revalidatePath('/tracker');
    return { success: true, task };
  } catch (err) {
    console.error('Create task error:', err);
    return { error: 'Failed to create task.' };
  }
}

export async function toggleTaskStatusAction(taskId: string, status: TaskStatus) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Permission denied.' };
  }

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });

    revalidatePath('/projects');
    revalidatePath('/tracker');
    return { success: true };
  } catch (err) {
    console.error('Toggle task status error:', err);
    return { error: 'Failed to update task status.' };
  }
}

export async function toggleArchiveTaskAction(taskId: string) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Permission denied.' };
  }

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { error: 'Task not found.' };

    await prisma.task.update({
      where: { id: taskId },
      data: { isArchived: !task.isArchived },
    });

    revalidatePath('/projects');
    revalidatePath('/tracker');
    return { success: true };
  } catch (err) {
    console.error('Archive task error:', err);
    return { error: 'Failed to toggle task archive.' };
  }
}

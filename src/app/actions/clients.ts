'use server';

import { prisma } from '@/lib/prisma';
import { requireAuthSession } from './workspace';
import { WorkspaceRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getClientsAction(includeArchived = false) {
  const session = await requireAuthSession();
  return prisma.client.findMany({
    where: {
      workspaceId: session.activeWorkspaceId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    include: {
      _count: {
        select: { projects: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createClientAction(formData: FormData) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Only admins and managers can create clients.' };
  }

  const name = formData.get('name')?.toString().trim();
  if (!name) return { error: 'Client name is required.' };

  try {
    const existing = await prisma.client.findUnique({
      where: {
        workspaceId_name: {
          workspaceId: session.activeWorkspaceId,
          name,
        },
      },
    });

    if (existing) {
      if (existing.isArchived) {
        // Unarchive
        await prisma.client.update({
          where: { id: existing.id },
          data: { isArchived: false },
        });
        revalidatePath('/clients');
        return { success: true };
      }
      return { error: 'A client with this name already exists in this workspace.' };
    }

    await prisma.client.create({
      data: {
        name,
        workspaceId: session.activeWorkspaceId,
      },
    });

    revalidatePath('/clients');
    return { success: true };
  } catch (err) {
    console.error('Create client error:', err);
    return { error: 'Failed to create client.' };
  }
}

export async function updateClientAction(clientId: string, name: string) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Only admins and managers can update clients.' };
  }

  const trimmed = name.trim();
  if (!trimmed) return { error: 'Client name is required.' };

  try {
    await prisma.client.update({
      where: { id: clientId, workspaceId: session.activeWorkspaceId },
      data: { name: trimmed },
    });
    revalidatePath('/clients');
    return { success: true };
  } catch (err) {
    console.error('Update client error:', err);
    return { error: 'Failed to update client.' };
  }
}

export async function toggleArchiveClientAction(clientId: string) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Permission denied.' };
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId, workspaceId: session.activeWorkspaceId },
    });

    if (!client) return { error: 'Client not found.' };

    await prisma.client.update({
      where: { id: clientId },
      data: { isArchived: !client.isArchived },
    });

    revalidatePath('/clients');
    return { success: true };
  } catch (err) {
    console.error('Archive client error:', err);
    return { error: 'Failed to toggle client archive status.' };
  }
}

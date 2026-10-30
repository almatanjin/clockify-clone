'use server';

import { prisma } from '@/lib/prisma';
import { requireAuthSession } from './workspace';
import { WorkspaceRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getTagsAction(includeArchived = false) {
  const session = await requireAuthSession();
  return prisma.tag.findMany({
    where: {
      workspaceId: session.activeWorkspaceId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    include: {
      _count: {
        select: { timeEntries: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createTagAction(formData: FormData) {
  const session = await requireAuthSession();
  const name = formData.get('name')?.toString().trim().toLowerCase();

  if (!name) return { error: 'Tag name is required.' };

  try {
    const existing = await prisma.tag.findUnique({
      where: {
        workspaceId_name: {
          workspaceId: session.activeWorkspaceId,
          name,
        },
      },
    });

    if (existing) {
      if (existing.isArchived) {
        await prisma.tag.update({
          where: { id: existing.id },
          data: { isArchived: false },
        });
        revalidatePath('/tags');
        return { success: true };
      }
      return { error: 'Tag already exists in this workspace.' };
    }

    await prisma.tag.create({
      data: {
        name,
        workspaceId: session.activeWorkspaceId,
      },
    });

    revalidatePath('/tags');
    return { success: true };
  } catch (err) {
    console.error('Create tag error:', err);
    return { error: 'Failed to create tag.' };
  }
}

export async function updateTagAction(tagId: string, name: string) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Permission denied.' };
  }

  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return { error: 'Tag name is required.' };

  try {
    await prisma.tag.update({
      where: { id: tagId, workspaceId: session.activeWorkspaceId },
      data: { name: trimmed },
    });
    revalidatePath('/tags');
    return { success: true };
  } catch (err) {
    console.error('Update tag error:', err);
    return { error: 'Failed to update tag.' };
  }
}

export async function toggleArchiveTagAction(tagId: string) {
  const session = await requireAuthSession();
  if (session.role === WorkspaceRole.MEMBER) {
    return { error: 'Permission denied.' };
  }

  try {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId, workspaceId: session.activeWorkspaceId },
    });
    if (!tag) return { error: 'Tag not found.' };

    await prisma.tag.update({
      where: { id: tagId },
      data: { isArchived: !tag.isArchived },
    });

    revalidatePath('/tags');
    return { success: true };
  } catch (err) {
    console.error('Archive tag error:', err);
    return { error: 'Failed to toggle tag archive.' };
  }
}

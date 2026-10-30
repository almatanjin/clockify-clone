'use server';

import { prisma } from '@/lib/prisma';
import { getSession, setSessionCookie, SessionPayload } from '@/lib/auth';
import { WorkspaceRole, WeekStart, InvitationStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function requireAuthSession() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized. Please log in.');
  }

  // Ensure role is always fresh from database for the active workspace
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.userId,
        workspaceId: session.activeWorkspaceId,
      },
    },
    select: { role: true },
  });

  if (member && member.role !== session.role) {
    session.role = member.role;
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireAuthSession();
  if (session.role !== WorkspaceRole.ADMIN) {
    throw new Error('Access denied. Administrator privileges required.');
  }
  return session;
}

export async function createWorkspaceAction(formData: FormData) {
  const session = await requireAuthSession();
  const name = formData.get('name')?.toString().trim();
  const currency = formData.get('currency')?.toString().trim() || 'USD';
  const defaultHourlyRate = Math.round(Number(formData.get('defaultHourlyRate') || 0) * 100);
  const weekStart = (formData.get('weekStart')?.toString() as WeekStart) || WeekStart.MONDAY;

  if (!name) {
    return { error: 'Workspace name is required.' };
  }

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: session.userId,
        currency,
        defaultHourlyRate,
        weekStart,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        userId: session.userId,
        workspaceId: workspace.id,
        role: WorkspaceRole.ADMIN,
        hourlyRate: defaultHourlyRate,
      },
    });

    // Switch active workspace in session
    const updatedPayload: SessionPayload = {
      ...session,
      activeWorkspaceId: workspace.id,
      role: WorkspaceRole.ADMIN,
    };
    await setSessionCookie(updatedPayload);

    revalidatePath('/', 'layout');
    return { success: true, workspaceId: workspace.id };
  } catch (error) {
    console.error('Create workspace error:', error);
    return { error: 'Failed to create workspace.' };
  }
}

export async function updateWorkspaceSettingsAction(formData: FormData) {
  const session = await requireAdminSession();
  const name = formData.get('name')?.toString().trim();
  const currency = formData.get('currency')?.toString().trim() || 'USD';
  const defaultHourlyRateDollars = Number(formData.get('defaultHourlyRate') || 0);
  const defaultHourlyRate = Math.round(defaultHourlyRateDollars * 100);
  const weekStart = (formData.get('weekStart')?.toString() as WeekStart) || WeekStart.MONDAY;

  if (!name) {
    return { error: 'Workspace name is required.' };
  }

  try {
    await prisma.workspace.update({
      where: { id: session.activeWorkspaceId },
      data: {
        name,
        currency,
        defaultHourlyRate,
        weekStart,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/tracker');
    revalidatePath('/timesheet');
    revalidatePath('/projects');
    revalidatePath('/reports');
    revalidatePath('/team');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Update workspace error:', error);
    return { error: 'Failed to update workspace settings.' };
  }
}

export async function inviteMemberAction(formData: FormData) {
  const session = await requireAdminSession();
  const email = formData.get('email')?.toString().trim().toLowerCase();
  const role = (formData.get('role')?.toString() as WorkspaceRole) || WorkspaceRole.MEMBER;
  const hourlyRateDollars = Number(formData.get('hourlyRate') || 0);
  const hourlyRate = Math.round(hourlyRateDollars * 100);

  if (!email) {
    return { error: 'Member email is required.' };
  }

  try {
    // 1. Check if user already exists and is a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        workspaceMemberships: {
          where: { workspaceId: session.activeWorkspaceId },
        },
      },
    });

    if (existingUser && existingUser.workspaceMemberships.length > 0) {
      return { error: 'This user is already a member of this workspace.' };
    }

    // 2. If user already exists in DB, add them directly
    if (existingUser) {
      await prisma.workspaceMember.create({
        data: {
          userId: existingUser.id,
          workspaceId: session.activeWorkspaceId,
          role,
          hourlyRate: hourlyRate > 0 ? hourlyRate : null,
        },
      });

      revalidatePath('/team');
      return { success: true, message: 'Member added to workspace directly.' };
    }

    // 3. Otherwise create pending Invitation record
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days expiration

    await prisma.invitation.upsert({
      where: { token },
      update: {},
      create: {
        email,
        workspaceId: session.activeWorkspaceId,
        role,
        hourlyRate: hourlyRate > 0 ? hourlyRate : null,
        token,
        status: InvitationStatus.PENDING,
        expiresAt,
      },
    });

    revalidatePath('/team');
    return {
      success: true,
      message: 'Invitation sent! Member will be bound automatically upon registration.',
      inviteToken: token,
    };
  } catch (error) {
    console.error('Invite member error:', error);
    return { error: 'Failed to send invitation.' };
  }
}

export async function updateMemberRoleOrRateAction(formData: FormData) {
  const session = await requireAdminSession();
  const memberId = formData.get('memberId')?.toString();
  const role = formData.get('role')?.toString() as WorkspaceRole;
  const hourlyRateDollars = Number(formData.get('hourlyRate') || 0);
  const hourlyRate = Math.round(hourlyRateDollars * 100);

  if (!memberId || !role) {
    return { error: 'Invalid parameters.' };
  }

  try {
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { workspace: true },
    });

    if (!member || member.workspaceId !== session.activeWorkspaceId) {
      return { error: 'Member not found in active workspace.' };
    }

    // Protect workspace owner from being demoted
    if (member.workspace.ownerId === member.userId && role !== WorkspaceRole.ADMIN) {
      return { error: 'The workspace owner must remain an Administrator.' };
    }

    await prisma.workspaceMember.update({
      where: { id: memberId },
      data: {
        role,
        hourlyRate: hourlyRate > 0 ? hourlyRate : null,
      },
    });

    revalidatePath('/team');
    return { success: true };
  } catch (error) {
    console.error('Update member error:', error);
    return { error: 'Failed to update member.' };
  }
}

export async function removeMemberAction(memberId: string) {
  const session = await requireAdminSession();

  try {
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { workspace: true },
    });

    if (!member || member.workspaceId !== session.activeWorkspaceId) {
      return { error: 'Member not found.' };
    }

    if (member.workspace.ownerId === member.userId) {
      return { error: 'Cannot remove workspace owner.' };
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    revalidatePath('/team');
    return { success: true };
  } catch (error) {
    console.error('Remove member error:', error);
    return { error: 'Failed to remove member.' };
  }
}

export async function getWorkspaceContextData() {
  const session = await requireAuthSession();

  const [workspace, userWorkspaces, members, invitations] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: session.activeWorkspaceId },
    }),
    prisma.workspaceMember.findMany({
      where: { userId: session.userId },
      include: { workspace: true },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: session.activeWorkspaceId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    }),
    session.role === WorkspaceRole.ADMIN
      ? prisma.invitation.findMany({
          where: {
            workspaceId: session.activeWorkspaceId,
            status: InvitationStatus.PENDING,
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  return {
    session,
    workspace,
    userWorkspaces,
    members,
    invitations,
  };
}

'use server';

import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  getSession,
  SessionPayload,
} from '@/lib/auth';
import { WorkspaceRole, InvitationStatus, WeekStart } from '@prisma/client';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function registerAction(formData: FormData) {
  const email = formData.get('email')?.toString().trim().toLowerCase();
  const password = formData.get('password')?.toString();
  const name = formData.get('name')?.toString().trim();
  const timezone = formData.get('timezone')?.toString() || 'UTC';

  if (!email || !password || !name) {
    return { error: 'All fields are required.' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: 'An account with this email already exists.' };
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        timezone,
      },
    });

    // Check for pending invitations
    const pendingInvitations = await prisma.invitation.findMany({
      where: {
        email,
        status: InvitationStatus.PENDING,
      },
    });

    let activeWorkspaceId = '';
    let role: WorkspaceRole = WorkspaceRole.ADMIN;

    if (pendingInvitations.length > 0) {
      for (const invite of pendingInvitations) {
        await prisma.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: invite.workspaceId,
            role: invite.role,
            hourlyRate: invite.hourlyRate,
          },
        });
        await prisma.invitation.update({
          where: { id: invite.id },
          data: { status: InvitationStatus.ACCEPTED },
        });
      }
      activeWorkspaceId = pendingInvitations[0].workspaceId;
      role = pendingInvitations[0].role;
    } else {
      // Create personal default workspace
      const defaultWorkspace = await prisma.workspace.create({
        data: {
          name: `${name}'s Workspace`,
          ownerId: user.id,
          currency: 'USD',
          defaultHourlyRate: 5000,
          weekStart: WeekStart.MONDAY,
        },
      });

      await prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: defaultWorkspace.id,
          role: WorkspaceRole.ADMIN,
          hourlyRate: 5000,
        },
      });

      activeWorkspaceId = defaultWorkspace.id;
      role = WorkspaceRole.ADMIN;
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      activeWorkspaceId,
      role,
      timezone: user.timezone,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'Failed to create account. Please try again.' };
  }

  redirect('/tracker');
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email')?.toString().trim().toLowerCase();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        workspaceMemberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      return { error: 'Invalid email or password.' };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { error: 'Invalid email or password.' };
    }

    let activeMembership = user.workspaceMemberships[0];

    // If no membership exists, create a default workspace
    if (!activeMembership) {
      const workspace = await prisma.workspace.create({
        data: {
          name: `${user.name}'s Workspace`,
          ownerId: user.id,
          currency: 'USD',
          defaultHourlyRate: 5000,
          weekStart: WeekStart.MONDAY,
        },
      });

      activeMembership = await prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: WorkspaceRole.ADMIN,
        },
        include: {
          workspace: true,
        },
      });
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      activeWorkspaceId: activeMembership.workspaceId,
      role: activeMembership.role,
      timezone: user.timezone,
    });
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Failed to log in. Please try again.' };
  }

  redirect('/tracker');
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect('/login');
}

export async function switchWorkspaceAction(workspaceId: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.userId,
        workspaceId,
      },
    },
  });

  if (!membership) {
    throw new Error('Access denied to workspace');
  }

  const updatedPayload: SessionPayload = {
    ...session,
    activeWorkspaceId: workspaceId,
    role: membership.role,
  };

  await setSessionCookie(updatedPayload);
  revalidatePath('/', 'layout');
}

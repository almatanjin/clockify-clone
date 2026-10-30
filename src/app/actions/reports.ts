'use server';

import { prisma } from '@/lib/prisma';
import { requireAuthSession } from './workspace';
import { WorkspaceRole } from '@prisma/client';

export interface ReportFilters {
  preset?: 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'all' | 'custom';
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  userId?: string;
  clientId?: string;
  projectId?: string;
  tagId?: string;
  billable?: 'all' | 'billable' | 'non-billable';
}

function resolveDateRange(preset: string, startParam?: string, endParam?: string) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (preset === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'thisWeek') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'lastWeek') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
    start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'thisMonth') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (preset === 'custom') {
    start = startParam ? new Date(`${startParam}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = endParam ? new Date(`${endParam}T23:59:59.999`) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    // Default last 30 days
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

export async function getReportsDataAction(filters: ReportFilters) {
  const session = await requireAuthSession();
  const { start, end } = resolveDateRange(
    filters.preset || 'thisMonth',
    filters.startDate,
    filters.endDate
  );

  // Role Scoping: MEMBER can only see their own time entries
  const isMember = session.role === WorkspaceRole.MEMBER;
  const targetUserId = isMember ? session.userId : filters.userId || undefined;

  // Build Prisma Where Clause
  const whereClause: any = {
    workspaceId: session.activeWorkspaceId,
    startTime: {
      gte: start,
      lte: end,
    },
    endTime: { not: null },
  };

  if (targetUserId) {
    whereClause.userId = targetUserId;
  }

  if (filters.projectId) {
    whereClause.projectId = filters.projectId;
  }

  // Ensure non-admins only see time entries for public projects or assigned private projects
  if (session.role !== WorkspaceRole.ADMIN) {
    whereClause.project = {
      OR: [
        { isPublic: true },
        { members: { some: { userId: session.userId } } },
      ],
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
    };
  } else if (filters.clientId) {
    whereClause.project = {
      clientId: filters.clientId,
    };
  }

  if (filters.billable === 'billable') {
    whereClause.isBillable = true;
  } else if (filters.billable === 'non-billable') {
    whereClause.isBillable = false;
  }

  if (filters.tagId) {
    whereClause.tags = {
      some: { tagId: filters.tagId },
    };
  }

  // Fetch entries
  const entries = await prisma.timeEntry.findMany({
    where: whereClause,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
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
  });

  // Aggregations
  let totalDurationSeconds = 0;
  let billableDurationSeconds = 0;
  let nonBillableDurationSeconds = 0;
  let totalRevenueCents = 0;

  const projectMap: Record<string, { name: string; color: string; seconds: number; revenueCents: number }> = {};
  const clientMap: Record<string, { name: string; seconds: number; revenueCents: number }> = {};
  const userMap: Record<string, { name: string; seconds: number; revenueCents: number }> = {};
  const dailyTrendMap: Record<string, { dateStr: string; label: string; totalHours: number; billableHours: number }> = {};

  entries.forEach((entry) => {
    const dur = entry.duration || 0;
    const hours = dur / 3600;
    const rev = entry.isBillable ? Math.round(hours * entry.hourlyRate) : 0;

    totalDurationSeconds += dur;
    if (entry.isBillable) {
      billableDurationSeconds += dur;
      totalRevenueCents += rev;
    } else {
      nonBillableDurationSeconds += dur;
    }

    // Project breakdown
    const pName = entry.project?.name || 'No Project';
    const pColor = entry.project?.color || '#64748B';
    if (!projectMap[pName]) {
      projectMap[pName] = { name: pName, color: pColor, seconds: 0, revenueCents: 0 };
    }
    projectMap[pName].seconds += dur;
    projectMap[pName].revenueCents += rev;

    // Client breakdown
    const cName = entry.project?.client?.name || 'No Client';
    if (!clientMap[cName]) {
      clientMap[cName] = { name: cName, seconds: 0, revenueCents: 0 };
    }
    clientMap[cName].seconds += dur;
    clientMap[cName].revenueCents += rev;

    // User breakdown
    const uName = entry.user.name;
    if (!userMap[uName]) {
      userMap[uName] = { name: uName, seconds: 0, revenueCents: 0 };
    }
    userMap[uName].seconds += dur;
    userMap[uName].revenueCents += rev;

    // Daily trend
    const dStr = new Date(entry.startTime).toLocaleDateString('en-CA');
    if (!dailyTrendMap[dStr]) {
      const d = new Date(entry.startTime);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyTrendMap[dStr] = { dateStr: dStr, label, totalHours: 0, billableHours: 0 };
    }
    dailyTrendMap[dStr].totalHours += Number(hours.toFixed(2));
    if (entry.isBillable) {
      dailyTrendMap[dStr].billableHours += Number(hours.toFixed(2));
    }
  });

  const projectBreakdown = Object.values(projectMap).map((p) => ({
    ...p,
    percentage: totalDurationSeconds > 0 ? Math.round((p.seconds / totalDurationSeconds) * 100) : 0,
  }));

  const clientBreakdown = Object.values(clientMap);
  const userBreakdown = Object.values(userMap);
  const dailyTrend = Object.values(dailyTrendMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  return {
    totalDurationSeconds,
    billableDurationSeconds,
    nonBillableDurationSeconds,
    totalRevenueCents,
    projectBreakdown,
    clientBreakdown,
    userBreakdown,
    dailyTrend,
    entries,
    dateRange: {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    },
  };
}

export async function exportReportCsvAction(filters: ReportFilters) {
  const { entries } = await getReportsDataAction(filters);

  // RFC 4180 CSV Export
  const headers = [
    'Date',
    'User',
    'Email',
    'Client',
    'Project',
    'Task',
    'Tags',
    'Description',
    'Start Time',
    'End Time',
    'Duration (HH:MM:SS)',
    'Duration (Seconds)',
    'Billable',
    'Hourly Rate ($)',
    'Billable Amount ($)',
  ];

  const rows = entries.map((e) => {
    const d = new Date(e.startTime);
    const dateStr = d.toLocaleDateString('en-CA');
    const startStr = d.toLocaleTimeString();
    const endStr = e.endTime ? new Date(e.endTime).toLocaleTimeString() : '';
    const durSec = e.duration || 0;

    const h = Math.floor(durSec / 3600);
    const m = Math.floor((durSec % 3600) / 60);
    const s = durSec % 60;
    const durFormatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const tagsStr = e.tags.map((t) => t.tag.name).join('; ');
    const rateDollars = (e.hourlyRate / 100).toFixed(2);
    const billableAmountDollars = e.isBillable ? ((durSec / 3600) * (e.hourlyRate / 100)).toFixed(2) : '0.00';

    return [
      dateStr,
      e.user.name,
      e.user.email,
      e.project?.client?.name || '',
      e.project?.name || '',
      e.task?.name || '',
      tagsStr,
      e.description,
      startStr,
      endStr,
      durFormatted,
      durSec.toString(),
      e.isBillable ? 'Yes' : 'No',
      rateDollars,
      billableAmountDollars,
    ];
  });

  const escapeCsv = (str: string) => {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');

  return {
    filename: `clockify-report-${new Date().toISOString().split('T')[0]}.csv`,
    content: csvContent,
  };
}

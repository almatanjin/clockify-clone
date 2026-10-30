import { redis, isRedisAvailable } from './redis';
import { prisma } from './prisma';

export interface ActiveTimerData {
  id: string;
  workspaceId: string;
  userId: string;
  projectId?: string | null;
  projectName?: string | null;
  projectColor?: string | null;
  taskId?: string | null;
  taskName?: string | null;
  description: string;
  startTime: string; // ISO String
  isBillable: boolean;
  hourlyRate: number; // integer cents
  tags?: string[]; // tag names or IDs
}

function getTimerCacheKey(workspaceId: string, userId: string): string {
  return `timer:${workspaceId}:${userId}`;
}

export async function getActiveTimer(
  workspaceId: string,
  userId: string
): Promise<ActiveTimerData | null> {
  const cacheKey = getTimerCacheKey(workspaceId, userId);

  // 1. Try reading from Redis
  if (await isRedisAvailable() && redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as ActiveTimerData;
      }
    } catch (err) {
      console.warn('[ActiveTimer] Redis read error, checking PostgreSQL:', err);
    }
  }

  // 2. Fallback to PostgreSQL as source of truth
  try {
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        workspaceId,
        userId,
        endTime: null,
      },
      include: {
        project: true,
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

    if (!activeEntry) return null;

    const timerData: ActiveTimerData = {
      id: activeEntry.id,
      workspaceId: activeEntry.workspaceId,
      userId: activeEntry.userId,
      projectId: activeEntry.projectId,
      projectName: activeEntry.project?.name ?? null,
      projectColor: activeEntry.project?.color ?? null,
      taskId: activeEntry.taskId,
      taskName: activeEntry.task?.name ?? null,
      description: activeEntry.description,
      startTime: activeEntry.startTime.toISOString(),
      isBillable: activeEntry.isBillable,
      hourlyRate: activeEntry.hourlyRate,
      tags: activeEntry.tags.map((t) => t.tag.name),
    };

    // Populate Redis cache asynchronously
    if (await isRedisAvailable() && redis) {
      redis.set(cacheKey, JSON.stringify(timerData), 'EX', 86400).catch(() => {});
    }

    return timerData;
  } catch (dbError) {
    console.error('[ActiveTimer] Database fetch error:', dbError);
    return null;
  }
}

export async function setActiveTimer(timer: ActiveTimerData): Promise<void> {
  const cacheKey = getTimerCacheKey(timer.workspaceId, timer.userId);

  if (await isRedisAvailable() && redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(timer), 'EX', 86400); // 24 hours
    } catch (err) {
      console.warn('[ActiveTimer] Redis cache write failed (DB remains source of truth):', err);
    }
  }
}

export async function clearActiveTimer(workspaceId: string, userId: string): Promise<void> {
  const cacheKey = getTimerCacheKey(workspaceId, userId);

  if (await isRedisAvailable() && redis) {
    try {
      await redis.del(cacheKey);
    } catch (err) {
      console.warn('[ActiveTimer] Redis cache delete failed:', err);
    }
  }
}

import { PrismaClient, WorkspaceRole, WeekStart, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Clockify database...');

  // 1. Password Hash
  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      passwordHash,
      name: 'Alex Admin',
      timezone: 'America/New_York',
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      email: 'manager@company.com',
      passwordHash,
      name: 'Morgan Manager',
      timezone: 'America/New_York',
    },
  });

  const devUser = await prisma.user.upsert({
    where: { email: 'developer@company.com' },
    update: {},
    create: {
      email: 'developer@company.com',
      passwordHash,
      name: 'Dev Dan',
      timezone: 'America/New_York',
    },
  });

  // 3. Workspace
  let workspace = await prisma.workspace.findFirst({
    where: { ownerId: adminUser.id, name: 'Acme Corp HQ' },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Acme Corp HQ',
        ownerId: adminUser.id,
        currency: 'USD',
        defaultHourlyRate: 5000, // $50.00/hr
        weekStart: WeekStart.MONDAY,
      },
    });
  }

  // 4. Workspace Memberships
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: adminUser.id, workspaceId: workspace.id } },
    update: { role: WorkspaceRole.ADMIN, hourlyRate: 7500 },
    create: {
      userId: adminUser.id,
      workspaceId: workspace.id,
      role: WorkspaceRole.ADMIN,
      hourlyRate: 7500, // $75/hr
    },
  });

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: managerUser.id, workspaceId: workspace.id } },
    update: { role: WorkspaceRole.MANAGER, hourlyRate: 6000 },
    create: {
      userId: managerUser.id,
      workspaceId: workspace.id,
      role: WorkspaceRole.MANAGER,
      hourlyRate: 6000, // $60/hr
    },
  });

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: devUser.id, workspaceId: workspace.id } },
    update: { role: WorkspaceRole.MEMBER, hourlyRate: 4500 },
    create: {
      userId: devUser.id,
      workspaceId: workspace.id,
      role: WorkspaceRole.MEMBER,
      hourlyRate: 4500, // $45/hr
    },
  });

  // 5. Clients
  const stripeClient = await prisma.client.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: 'Stripe Global' } },
    update: {},
    create: {
      name: 'Stripe Global',
      workspaceId: workspace.id,
    },
  });

  const spotifyClient = await prisma.client.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: 'Spotify Media' } },
    update: {},
    create: {
      name: 'Spotify Media',
      workspaceId: workspace.id,
    },
  });

  const internalClient = await prisma.client.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: 'Internal Projects' } },
    update: {},
    create: {
      name: 'Internal Projects',
      workspaceId: workspace.id,
    },
  });

  // 6. Projects
  const stripeProject = await prisma.project.upsert({
    where: {
      workspaceId_clientId_name: {
        workspaceId: workspace.id,
        clientId: stripeClient.id,
        name: 'Payment Gateway Integration',
      },
    },
    update: {},
    create: {
      name: 'Payment Gateway Integration',
      color: '#06B6D4',
      clientId: stripeClient.id,
      workspaceId: workspace.id,
      isBillable: true,
      hourlyRate: 8500, // $85.00/hr
      isPublic: true,
    },
  });

  const spotifyProject = await prisma.project.upsert({
    where: {
      workspaceId_clientId_name: {
        workspaceId: workspace.id,
        clientId: spotifyClient.id,
        name: 'Audio Streaming API',
      },
    },
    update: {},
    create: {
      name: 'Audio Streaming API',
      color: '#10B981',
      clientId: spotifyClient.id,
      workspaceId: workspace.id,
      isBillable: true,
      hourlyRate: 7000, // $70.00/hr
      isPublic: true,
    },
  });

  const internalProject = await prisma.project.upsert({
    where: {
      workspaceId_clientId_name: {
        workspaceId: workspace.id,
        clientId: internalClient.id,
        name: 'DevOps & Tooling',
      },
    },
    update: {},
    create: {
      name: 'DevOps & Tooling',
      color: '#F59E0B',
      clientId: internalClient.id,
      workspaceId: workspace.id,
      isBillable: false,
      hourlyRate: 0,
      isPublic: true,
    },
  });

  // 7. Tasks
  const task1 = await prisma.task.upsert({
    where: { projectId_name: { projectId: stripeProject.id, name: 'Webhook Handling' } },
    update: {},
    create: {
      name: 'Webhook Handling',
      projectId: stripeProject.id,
      status: TaskStatus.ACTIVE,
    },
  });

  const task2 = await prisma.task.upsert({
    where: { projectId_name: { projectId: stripeProject.id, name: 'Checkout UI' } },
    update: {},
    create: {
      name: 'Checkout UI',
      projectId: stripeProject.id,
      status: TaskStatus.ACTIVE,
    },
  });

  const task3 = await prisma.task.upsert({
    where: { projectId_name: { projectId: spotifyProject.id, name: 'Audio Pipeline' } },
    update: {},
    create: {
      name: 'Audio Pipeline',
      projectId: spotifyProject.id,
      status: TaskStatus.ACTIVE,
    },
  });

  // 8. Tags
  const tagBug = await prisma.tag.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: 'bugfix' } },
    update: {},
    create: { name: 'bugfix', workspaceId: workspace.id },
  });

  const tagFeature = await prisma.tag.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: 'feature' } },
    update: {},
    create: { name: 'feature', workspaceId: workspace.id },
  });

  const tagMeeting = await prisma.tag.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: 'meeting' } },
    update: {},
    create: { name: 'meeting', workspaceId: workspace.id },
  });

  // 9. Historical 30-Day Time Entries
  const existingEntriesCount = await prisma.timeEntry.count({
    where: { workspaceId: workspace.id },
  });

  if (existingEntriesCount === 0) {
    console.log('Generating 30 days of historical time entries...');
    const now = new Date();
    const userList = [adminUser, managerUser, devUser];
    const projectList = [stripeProject, spotifyProject, internalProject];
    const taskList = [task1, task2, task3];

    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const entryDate = new Date(now);
      entryDate.setDate(now.getDate() - dayOffset);
      const isWeekend = entryDate.getDay() === 0 || entryDate.getDay() === 6;

      // Skip most weekend days to keep realistic business hours
      if (isWeekend && dayOffset % 3 !== 0) continue;

      for (const user of userList) {
        // 1 to 3 entries per user per working day
        const numEntries = 1 + (dayOffset % 3);
        let startHour = 9;

        for (let i = 0; i < numEntries; i++) {
          const proj = projectList[(dayOffset + i) % projectList.length];
          const task = taskList[(dayOffset + i) % taskList.length];
          const durationHours = 1 + (i % 3);
          const durationSeconds = durationHours * 3600;

          const startTime = new Date(entryDate);
          startTime.setHours(startHour, 0, 0, 0);

          const endTime = new Date(startTime);
          endTime.setSeconds(startTime.getSeconds() + durationSeconds);
          startHour += durationHours + 1;

          const isBillable = proj.isBillable;
          const hourlyRate = proj.hourlyRate ?? 5000;

          const entry = await prisma.timeEntry.create({
            data: {
              workspaceId: workspace.id,
              userId: user.id,
              projectId: proj.id,
              taskId: task.projectId === proj.id ? task.id : null,
              description: `Work on ${proj.name} - ${task.name}`,
              startTime,
              endTime,
              duration: durationSeconds,
              isBillable,
              hourlyRate,
            },
          });

          // Attach tag
          const tagToUse = i === 0 ? tagFeature : i === 1 ? tagBug : tagMeeting;
          await prisma.timeEntryTag.create({
            data: {
              timeEntryId: entry.id,
              tagId: tagToUse.id,
            },
          });
        }
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

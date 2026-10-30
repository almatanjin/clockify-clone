import { getActiveTimer, setActiveTimer, clearActiveTimer, ActiveTimerData } from '../src/lib/active-timer';
import { isRedisAvailable } from '../src/lib/redis';

async function runTest() {
  console.log('Testing Redis & Active Timer Cache Helpers...');

  const redisStatus = await isRedisAvailable();
  console.log('Redis available:', redisStatus);

  const mockTimer: ActiveTimerData = {
    id: 'test-entry-1',
    workspaceId: 'test-ws-1',
    userId: 'test-user-1',
    description: 'Running unit test for timer',
    startTime: new Date().toISOString(),
    isBillable: true,
    hourlyRate: 5000,
  };

  // Test setting timer
  await setActiveTimer(mockTimer);
  console.log('✓ setActiveTimer completed without uncaught exceptions');

  // Test clearing timer
  await clearActiveTimer(mockTimer.workspaceId, mockTimer.userId);
  console.log('✓ clearActiveTimer completed without uncaught exceptions');

  console.log('All active timer cache helper tests passed!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

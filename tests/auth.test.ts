import { hashPassword, verifyPassword, signSessionToken, verifySessionToken, SessionPayload } from '../src/lib/auth';
import { WorkspaceRole } from '@prisma/client';

async function runAuthTest() {
  console.log('Testing Password Hashing and JWT Session Tokens...');

  const password = 'mySecurePassword123';
  const hashed = await hashPassword(password);
  console.log('✓ Password hashed successfully');

  const isValid = await verifyPassword(password, hashed);
  if (!isValid) throw new Error('Password verification failed');
  console.log('✓ Password verified successfully');

  const isInvalid = await verifyPassword('wrongPassword', hashed);
  if (isInvalid) throw new Error('Password verification should fail for invalid password');
  console.log('✓ Invalid password correctly rejected');

  const testPayload: SessionPayload = {
    userId: 'usr_test_123',
    email: 'test@example.com',
    name: 'Test User',
    activeWorkspaceId: 'ws_test_456',
    role: WorkspaceRole.ADMIN,
    timezone: 'Asia/Dhaka',
  };

  const token = await signSessionToken(testPayload);
  console.log('✓ JWT signed successfully');

  const verified = await verifySessionToken(token);
  if (!verified || verified.userId !== testPayload.userId || verified.activeWorkspaceId !== testPayload.activeWorkspaceId) {
    throw new Error('JWT verification failed');
  }
  console.log('✓ JWT verified successfully with matching payload');

  console.log('All auth unit tests passed!');
  process.exit(0);
}

runAuthTest().catch((err) => {
  console.error('Auth test failed:', err);
  process.exit(1);
});

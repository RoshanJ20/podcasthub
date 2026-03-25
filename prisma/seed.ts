/**
 * Database seed script for The Audit Brief.
 *
 * Key responsibilities:
 * - Creates an initial superadmin user for bootstrapping the application
 * - Idempotent: skips creation if the user already exists
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * Dependencies:
 * - @prisma/client (PrismaClient)
 * - bcryptjs (password hashing)
 */
import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Default superadmin credentials for initial bootstrap. */
const SEED_ADMIN = {
  email: 'admin@auditbrief.local',
  password: 'Admin@12345678',
  displayName: 'System Admin',
  role: 'superadmin',
} as const;

/**
 * Seeds the database with an initial superadmin user.
 *
 * Checks if a user with the seed email already exists before creating.
 * Hashes the password with bcrypt (12 rounds) before storing.
 */
async function main(): Promise<void> {
  // eslint-disable-next-line no-console -- Seed scripts use console for operator feedback
  const log = console.log.bind(console);

  log('Seeding database...');

  const existing = await prisma.user.findUnique({
    where: { email: SEED_ADMIN.email },
  });

  if (existing) {
    log(`Superadmin "${SEED_ADMIN.email}" already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_ADMIN.password, 12);

  const user = await prisma.user.create({
    data: {
      email: SEED_ADMIN.email,
      passwordHash,
      displayName: SEED_ADMIN.displayName,
      role: SEED_ADMIN.role,
      authProvider: 'credentials',
    },
  });

  log(`Created superadmin user:`);
  log(`  Email:    ${SEED_ADMIN.email}`);
  log(`  Password: ${SEED_ADMIN.password}`);
  log(`  Role:     ${user.role}`);
  log(`  ID:       ${user.id}`);
  log('');
  log('Warning: Change this password after first login!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

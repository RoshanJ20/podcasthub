import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load env files: .env.local takes precedence (local dev), .env is the default (production VM)
dotenv.config({ path: ['.env.local', '.env'] });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
});

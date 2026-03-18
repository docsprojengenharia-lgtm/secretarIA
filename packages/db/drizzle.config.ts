import 'dotenv/config';
import { resolve } from 'path';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: resolve(process.cwd(), '../../.env') });

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://secretaria:secretaria_dev@localhost:5432/secretaria',
  },
  verbose: true,
  strict: false,
} satisfies Config;

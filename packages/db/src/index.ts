import { resolve } from 'path';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: resolve(process.cwd(), '../../.env') });
dotenvConfig({ path: resolve(process.cwd(), '.env') });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL env var is required');

const poolSize = parseInt(process.env.DB_POOL_SIZE || '10');
export const connection = postgres(connectionString, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(connection, { schema });

export * from './schema/index.js';

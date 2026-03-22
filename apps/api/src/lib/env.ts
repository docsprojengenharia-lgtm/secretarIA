import { resolve } from 'path';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: resolve(process.cwd(), '../../.env') });
dotenvConfig({ path: resolve(process.cwd(), '.env') });

import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default(''),
  JWT_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  EVOLUTION_API_URL: z.string().min(1),
  EVOLUTION_API_KEY: z.string().min(1),
  API_URL: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SENTRY_DSN: z.string().optional().default(''),
  INSTAGRAM_VERIFY_TOKEN: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

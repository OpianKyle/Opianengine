import { z } from 'zod';

// Environment variables schema
const envSchema = z.object({
  JWT_SECRET: z.string().default('development-jwt-secret'),
  SESSION_SECRET: z.string(),
  DATABASE_URL: z.string(),
});

// Validate environment variables
const env = envSchema.parse({
  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
});

// Export validated environment variables
export const {
  JWT_SECRET,
  SESSION_SECRET,
  DATABASE_URL,
} = env;

console.log('Config loaded:', {
  hasJwtSecret: !!JWT_SECRET,
  hasSessionSecret: !!SESSION_SECRET,
  hasDbUrl: !!DATABASE_URL,
});

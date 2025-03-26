import { z } from 'zod';

// Environment variables schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().default('development-jwt-secret'),
  SESSION_SECRET: z.string(),
  DATABASE_URL: z.string(),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
});

// Validate environment variables
const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
});

// Export validated environment variables
export const {
  NODE_ENV,
  JWT_SECRET,
  SESSION_SECRET,
  DATABASE_URL,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
} = env;

// Environment specific configurations
export const isProduction = NODE_ENV === 'production';
export const isDevelopment = NODE_ENV === 'development';
export const isTest = NODE_ENV === 'test';

console.log('Config loaded:', {
  environment: NODE_ENV,
  hasJwtSecret: !!JWT_SECRET,
  hasSessionSecret: !!SESSION_SECRET,
  hasDbUrl: !!DATABASE_URL,
  hasGmailConfig: !!(GMAIL_USER && GMAIL_APP_PASSWORD),
});
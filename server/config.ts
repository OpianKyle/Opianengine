import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables schema
const envSchema = z.object({
  JWT_SECRET: z.string().default('development-jwt-secret'),
  SESSION_SECRET: z.string(),
  DB_HOST: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_PORT: z.string().default('3306'),
  DATABASE_URL: z.string().optional(),
});

// Log environment variables before validation
console.log('Raw environment variables:', {
  hasJwtSecret: !!process.env.JWT_SECRET,
  hasSessionSecret: !!process.env.SESSION_SECRET,
  hasDbHost: !!process.env.DB_HOST,
  hasDbUrl: !!process.env.DATABASE_URL
});

// Validate environment variables
const env = envSchema.parse({
  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: process.env.DB_PORT,
  DATABASE_URL: process.env.DATABASE_URL,
});

// Export validated environment variables
export const {
  JWT_SECRET,
  SESSION_SECRET,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
  DATABASE_URL,
} = env;

console.log('Config loaded:', {
  hasJwtSecret: !!JWT_SECRET,
  hasSessionSecret: !!SESSION_SECRET,
  hasDbHost: !!DB_HOST,
  hasDbUrl: !!DATABASE_URL,
});
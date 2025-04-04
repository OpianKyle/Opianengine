import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables first
const result = dotenv.config({
  path: path.resolve(__dirname, '..', '.env'),
  override: true
});

if (result.error) {
  console.error('Failed to load .env file:', result.error);
  process.exit(1);
}

// Log raw values for debugging
console.log('Environment variables pre-validation:', {
  sessionSecret: process.env.SESSION_SECRET,
  dbHost: process.env.DB_HOST,
  dbUrl: process.env.DATABASE_URL
});

// Define schema
const envSchema = z.object({
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_PORT: z.string().default('3306'),
  DATABASE_URL: z.string().optional(),
});

// Parse and validate
try {
  const env = envSchema.parse({
    SESSION_SECRET: process.env.SESSION_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
    DB_PORT: process.env.DB_PORT,
    DATABASE_URL: process.env.DATABASE_URL,
  });

  // Export validated values
  export const {
    SESSION_SECRET,
    JWT_SECRET,
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_PORT,
    DATABASE_URL,
  } = env;

  // Log validated config
  console.log('Environment validated:', {
    hasSessionSecret: true,
    sessionSecretLength: SESSION_SECRET.length,
    hasJwtSecret: true,
    hasDbConnection: true,
    dbHost: DB_HOST,
  });

} catch (error) {
  console.error('Environment validation failed:', error);
  process.exit(1);
}

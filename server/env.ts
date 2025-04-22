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
  PAYSTACK_SECRET_KEY: z.string().min(1, 'PAYSTACK_SECRET_KEY is required'),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
});

// Prepare variables for export
let SESSION_SECRET: string;
let JWT_SECRET: string;
let DB_HOST: string;
let DB_USER: string;
let DB_PASSWORD: string;
let DB_NAME: string;
let DB_PORT: string;
let DATABASE_URL: string | undefined;
let PAYSTACK_SECRET_KEY: string;
let PAYSTACK_PUBLIC_KEY: string | undefined;

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
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
  });

  // Assign validated values to the variables
  SESSION_SECRET = env.SESSION_SECRET;
  JWT_SECRET = env.JWT_SECRET;
  DB_HOST = env.DB_HOST;
  DB_USER = env.DB_USER;
  DB_PASSWORD = env.DB_PASSWORD;
  DB_NAME = env.DB_NAME;
  DB_PORT = env.DB_PORT;
  DATABASE_URL = env.DATABASE_URL;
  PAYSTACK_SECRET_KEY = env.PAYSTACK_SECRET_KEY;
  PAYSTACK_PUBLIC_KEY = env.PAYSTACK_PUBLIC_KEY;

  // Log validated config
  console.log('Environment validated:', {
    hasSessionSecret: true,
    sessionSecretLength: SESSION_SECRET.length,
    hasJwtSecret: true,
    hasDbConnection: true,
    dbHost: DB_HOST,
    hasPaystackKey: !!PAYSTACK_SECRET_KEY,
  });

} catch (error) {
  console.error('Environment validation failed:', error);
  process.exit(1);
}

// Export variables
export {
  SESSION_SECRET,
  JWT_SECRET,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
  DATABASE_URL,
  PAYSTACK_SECRET_KEY,
  PAYSTACK_PUBLIC_KEY
};

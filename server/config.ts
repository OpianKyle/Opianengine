import { z } from 'zod';
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// Handle ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables with explicit path
const result = dotenv.config({ 
  path: path.resolve(__dirname, '..', '.env'),
  override: true // Force override of existing env vars
});

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Environment variables schema with strict validation
const envSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET must not be empty'),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET must not be empty'),
  DB_HOST: z.string().min(1, 'DB_HOST must not be empty'),
  DB_USER: z.string().min(1, 'DB_USER must not be empty'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD must not be empty'),
  DB_NAME: z.string().min(1, 'DB_NAME must not be empty'),
  DB_PORT: z.string().default('3306'),
  DATABASE_URL: z.string().optional(),
});

// Log raw environment variables for debugging
console.log('Raw environment variables:', {
  hasJwtSecret: !!process.env.JWT_SECRET,
  hasSessionSecret: !!process.env.SESSION_SECRET,
  sessionSecretLength: process.env.SESSION_SECRET?.length,
  hasDbHost: !!process.env.DB_HOST,
  hasDbUrl: !!process.env.DATABASE_URL
});

// Parse and validate environment variables
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

// Log validated configuration
console.log('Validated config loaded:', {
  hasJwtSecret: !!JWT_SECRET,
  hasSessionSecret: !!SESSION_SECRET,
  sessionSecretLength: SESSION_SECRET.length,
  hasDbHost: !!DB_HOST,
  hasDbUrl: !!DATABASE_URL,
});
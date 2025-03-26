import { z } from 'zod';

// Environment variables schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().default('development-jwt-secret'),
  SESSION_SECRET: z.string(),
  MARIADB_HOST: z.string(),
  MARIADB_USER: z.string(),
  MARIADB_PASSWORD: z.string(),
  MARIADB_DATABASE: z.string(),
  MARIADB_PORT: z.string().transform(Number).default('3306'),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
});

// Validate environment variables
const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  MARIADB_HOST: process.env.MARIADB_HOST,
  MARIADB_USER: process.env.MARIADB_USER,
  MARIADB_PASSWORD: process.env.MARIADB_PASSWORD,
  MARIADB_DATABASE: process.env.MARIADB_DATABASE,
  MARIADB_PORT: process.env.MARIADB_PORT,
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
});

// Export validated environment variables
export const {
  NODE_ENV,
  JWT_SECRET,
  SESSION_SECRET,
  MARIADB_HOST,
  MARIADB_USER,
  MARIADB_PASSWORD,
  MARIADB_DATABASE,
  MARIADB_PORT,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
} = env;

// Environment specific configurations
export const isProduction = NODE_ENV === 'production';
export const isDevelopment = NODE_ENV === 'development';
export const isTest = NODE_ENV === 'test';

// Database connection configuration
export const dbConfig = {
  host: MARIADB_HOST,
  user: MARIADB_USER,
  password: MARIADB_PASSWORD,
  database: MARIADB_DATABASE,
  port: MARIADB_PORT,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('Config loaded:', {
  environment: NODE_ENV,
  hasJwtSecret: !!JWT_SECRET,
  hasSessionSecret: !!SESSION_SECRET,
  hasDbConfig: !!(MARIADB_HOST && MARIADB_USER && MARIADB_PASSWORD && MARIADB_DATABASE),
  hasGmailConfig: !!(GMAIL_USER && GMAIL_APP_PASSWORD),
});
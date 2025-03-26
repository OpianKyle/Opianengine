import { z } from 'zod';

// Debug logging for environment variables presence
console.log('Environment variables check:', {
  NODE_ENV: !!process.env.NODE_ENV,
  JWT_SECRET: !!process.env.JWT_SECRET,
  SESSION_SECRET: !!process.env.SESSION_SECRET,
  MARIADB_HOST: !!process.env.MARIADB_HOST,
  MARIADB_USER: !!process.env.MARIADB_USER,
  MARIADB_PASSWORD: !!process.env.MARIADB_PASSWORD,
  MARIADB_DATABASE: !!process.env.MARIADB_DATABASE,
  MARIADB_PORT: !!process.env.MARIADB_PORT,
  GMAIL_USER: !!process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD,
});

// Environment variables schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().default('development-jwt-secret'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters long'),
  MARIADB_HOST: z.string().min(1, 'Database host is required'),
  MARIADB_USER: z.string().min(1, 'Database user is required'),
  MARIADB_PASSWORD: z.string().min(1, 'Database password is required'),
  MARIADB_DATABASE: z.string().min(1, 'Database name is required'),
  MARIADB_PORT: z.string().transform(Number).default('3306'),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
});

try {
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

  // Log validated configuration
  console.log('Config loaded:', {
    environment: NODE_ENV,
    hasJwtSecret: !!JWT_SECRET,
    hasSessionSecret: !!SESSION_SECRET,
    hasDbConfig: !!(MARIADB_HOST && MARIADB_USER && MARIADB_PASSWORD && MARIADB_DATABASE),
    hasGmailConfig: !!(GMAIL_USER && GMAIL_APP_PASSWORD),
    dbHost: MARIADB_HOST,
    dbPort: MARIADB_PORT,
  });

} catch (error) {
  console.error('Configuration validation failed:');
  if (error instanceof z.ZodError) {
    console.error('Missing or invalid environment variables:');
    error.errors.forEach(err => {
      console.error(`- ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error('Unexpected error:', error);
  }
  process.exit(1);
}
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Debug logging for environment variables presence
console.log('Environment variables status:', {
  NODE_ENV: process.env.NODE_ENV || 'not set',
  hasJwtSecret: !!process.env.JWT_SECRET,
  hasSessionSecret: !!process.env.SESSION_SECRET,
  hasMariaDBCredentials: !!(
    process.env.MARIADB_HOST &&
    process.env.MARIADB_USER &&
    process.env.MARIADB_PASSWORD &&
    process.env.MARIADB_DATABASE
  ),
  hasEmailConfig: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
});

// Environment variables schema with detailed error messages
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test'])
    .default('development')
    .describe('Application environment (development/production/test)'),
  JWT_SECRET: z.string()
    .min(32, 'JWT secret must be at least 32 characters long')
    .default('development-jwt-secret-do-not-use-in-production'),
  SESSION_SECRET: z.string()
    .min(32, 'Session secret must be at least 32 characters long')
    .describe('Secret key for session encryption'),
  MARIADB_HOST: z.string()
    .min(1, 'Database host cannot be empty')
    .describe('MariaDB host address'),
  MARIADB_USER: z.string()
    .min(1, 'Database user cannot be empty')
    .describe('MariaDB username'),
  MARIADB_PASSWORD: z.string()
    .min(1, 'Database password cannot be empty')
    .describe('MariaDB password'),
  MARIADB_DATABASE: z.string()
    .min(1, 'Database name cannot be empty')
    .describe('MariaDB database name'),
  MARIADB_PORT: z.string()
    .transform(Number)
    .default('3306')
    .describe('MariaDB port number'),
  GMAIL_USER: z.string().optional()
    .describe('Gmail account for sending emails'),
  GMAIL_APP_PASSWORD: z.string().optional()
    .describe('Gmail app-specific password'),
});

const config = {
  NODE_ENV: 'development',
  JWT_SECRET: '',
  SESSION_SECRET: '',
  MARIADB_HOST: '',
  MARIADB_USER: '',
  MARIADB_PASSWORD: '',
  MARIADB_DATABASE: '',
  MARIADB_PORT: 3306,
  GMAIL_USER: '',
  GMAIL_APP_PASSWORD: '',
  isProduction: false,
  isDevelopment: true,
  isTest: false,
  dbConfig: {
    host: '',
    user: '',
    password: '',
    database: '',
    port: 3306,
    ssl: {
      rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }
} as const;

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

  // Update config object with validated values
  config.NODE_ENV = env.NODE_ENV;
  config.JWT_SECRET = env.JWT_SECRET;
  config.SESSION_SECRET = env.SESSION_SECRET;
  config.MARIADB_HOST = env.MARIADB_HOST;
  config.MARIADB_USER = env.MARIADB_USER;
  config.MARIADB_PASSWORD = env.MARIADB_PASSWORD;
  config.MARIADB_DATABASE = env.MARIADB_DATABASE;
  config.MARIADB_PORT = env.MARIADB_PORT;
  config.GMAIL_USER = env.GMAIL_USER;
  config.GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;

  config.isProduction = env.NODE_ENV === 'production';
  config.isDevelopment = env.NODE_ENV === 'development';
  config.isTest = env.NODE_ENV === 'test';

  config.dbConfig = {
    host: env.MARIADB_HOST,
    user: env.MARIADB_USER,
    password: env.MARIADB_PASSWORD,
    database: env.MARIADB_DATABASE,
    port: env.MARIADB_PORT,
    ssl: {
      rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // Log validated configuration (safely)
  console.log('Configuration validated:', {
    environment: config.NODE_ENV,
    hasJwtSecret: !!config.JWT_SECRET,
    hasSessionSecret: !!config.SESSION_SECRET,
    dbConfig: {
      host: config.dbConfig.host,
      port: config.dbConfig.port,
      database: config.dbConfig.database,
      user: config.dbConfig.user,
      hasPassword: !!config.dbConfig.password,
      ssl: !!config.dbConfig.ssl
    },
    hasEmailConfig: !!(config.GMAIL_USER && config.GMAIL_APP_PASSWORD)
  });

} catch (error) {
  console.error('Configuration validation failed:');
  if (error instanceof z.ZodError) {
    console.error('Missing or invalid environment variables:');
    error.errors.forEach(err => {
      console.error(`- ${err.path.join('.')}: ${err.message}`);
      if (err.path[0]) {
        console.error(`  Description: ${envSchema.shape[err.path[0]]._def.description}`);
      }
    });
  } else {
    console.error('Unexpected error:', error);
  }
  process.exit(1);
}

export default config;
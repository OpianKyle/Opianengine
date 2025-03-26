import { z } from 'zod';

// Environment variables schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  JWT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  // Database configuration
  DATABASE_URL: z.string().optional(),
  // MariaDB variables
  DB_HOST: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_PORT: z.string().transform(val => parseInt(val, 10)).optional(),
  // PostgreSQL variables
  PGHOST: z.string().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),
  PGPORT: z.string().transform(val => parseInt(val, 10)).optional(),
}).refine(data => {
  // Check for DATABASE_URL first
  if (data.DATABASE_URL) return true;

  // Then check for either MariaDB or PostgreSQL variables
  const hasMariaDB = !!(data.DB_HOST && data.DB_USER && data.DB_PASSWORD && data.DB_NAME);
  const hasPostgres = !!(data.PGHOST && data.PGUSER && data.PGPASSWORD && data.PGDATABASE);

  return hasMariaDB || hasPostgres;
}, {
  message: "Either DATABASE_URL or a complete set of database connection variables must be provided"
});

// Parse environment variables with more detailed error handling
try {
  const env = envSchema.parse(process.env);

  // Export validated environment variables
  export const {
    JWT_SECRET,
    SESSION_SECRET,
    DATABASE_URL,
  } = env;

  // Export derived database config
  export const DB_CONFIG = env.DATABASE_URL ? {
    url: env.DATABASE_URL
  } : env.DB_HOST ? {
    // MariaDB config
    host: env.DB_HOST,
    user: env.DB_USER!,
    password: env.DB_PASSWORD!,
    database: env.DB_NAME!,
    port: env.DB_PORT || 3306
  } : {
    // PostgreSQL config
    host: env.PGHOST!,
    user: env.PGUSER!,
    password: env.PGPASSWORD!,
    database: env.PGDATABASE!,
    port: env.PGPORT || 5432
  };

  // Log sanitized configuration (excluding sensitive data)
  console.log('Config loaded:', {
    nodeEnv: env.NODE_ENV,
    hasJwtSecret: !!JWT_SECRET,
    hasSessionSecret: !!SESSION_SECRET,
    hasDbUrl: !!DATABASE_URL,
    dbConfig: {
      ...(DATABASE_URL ? { url: '[REDACTED]' } : {
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        database: DB_CONFIG.database,
        user: DB_CONFIG.user
      })
    }
  });

} catch (error) {
  console.error('Environment validation failed:', error);
  throw error;
}
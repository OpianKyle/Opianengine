// We're keeping the MySQL import for now since the schema is still using it
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@db/schema";

// For future migration to PostgreSQL
// import { drizzle } from 'drizzle-orm/postgres-js';
// import postgres from 'postgres';

// Log environment variables for debugging
console.log('Database connection attempt with variables:', {
  dbHost: process.env.DB_HOST,
  dbUser: process.env.DB_USER,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasPgEnv: !!process.env.PGHOST,
  isProd: process.env.NODE_ENV === 'production'
});

// Create a connection pool for better performance and connection management
const poolConnection = mysql.createPool({
  // Try to use environment variables first
  host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || '8E33U976qa800F',
  database: process.env.DB_NAME || 'opianrewards',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// For future PostgreSQL migration
// const pgClient = postgres(process.env.DATABASE_URL || '');
// export const db = drizzle(pgClient);

// Initialize drizzle with the MySQL connection pool
export const db = drizzle(poolConnection, { 
  schema,
  mode: 'default',
  logger: true // Enable query logging for debugging
});

// Export the pool for direct queries if needed
export const pool = poolConnection;

// Add connection test function
export async function testConnection() {
  try {
    const connection = await poolConnection.getConnection();
    console.log('Database connection successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    if (process.env.DATABASE_URL) {
      console.log('Attempting fallback to PostgreSQL connection...');
      try {
        // We'll need to implement the PostgreSQL test here in the future
        // const result = await pgClient`SELECT 1 as test`;
        // console.log('PostgreSQL connection successful', result);
        return false; // For now, we don't have PostgreSQL implementation
      } catch (pgError) {
        console.error('PostgreSQL fallback connection failed:', pgError);
        return false;
      }
    }
    return false;
  }
}
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@db/schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;

function validateDatabaseUrl(url: string) {
  // Simple validation to ensure the URL has the correct format
  try {
    if (!url.startsWith('mysql://')) {
      throw new Error('DATABASE_URL must start with mysql://');
    }
    const [protocol, rest] = url.split('://');
    if (!rest.includes('@') || !rest.includes('/')) {
      throw new Error('DATABASE_URL must include credentials and database name');
    }
    console.log('Database URL format validation passed');
    return true;
  } catch (error) {
    console.error('Database URL validation failed:', error);
    throw error;
  }
}

async function initializeDb() {
  console.log('Starting database initialization...');

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  try {
    // Validate database URL format
    validateDatabaseUrl(process.env.DATABASE_URL);

    console.log('Attempting to establish MySQL connection...');
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('MySQL connection established successfully');

    console.log('Initializing Drizzle ORM...');
    const db = drizzle(connection, { mode: 'default', schema });
    console.log('Drizzle ORM initialized successfully');

    return db;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

export async function getDb() {
  if (!dbInstance) {
    console.log('No existing database instance found, creating new connection...');
    dbInstance = await initializeDb();
    console.log('Database instance created successfully');
  }
  return dbInstance;
}
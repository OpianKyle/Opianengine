import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@db/schema";

// Create a connection pool for better performance and connection management
const poolConnection = mysql.createPool({
  host: 'dedi1350.jnb1.host-h.net',
  user: 'admin',
  password: '8E33U976qa800F',
  database: 'opianrewards',
  port: 3306,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Initialize drizzle with the connection pool
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
    return false;
  }
}
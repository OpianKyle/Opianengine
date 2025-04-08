import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@db/schema";

// Create a connection pool for better performance and connection management
const poolConnection = mysql.createPool({
  host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'opianrewards',
  port: parseInt(process.env.DB_PORT || '3306', 10),
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
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@db/schema";

console.log('Creating database connection pool...');

// Create a connection pool for better performance and connection management
const poolConnection = mysql.createPool({
  host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || '8E33U976qa800F',
  database: process.env.DB_NAME || 'opianrewards',
  port: parseInt(process.env.DB_PORT || '3306'),
  ssl: {
    rejectUnauthorized: false
  },
  // Simplified connection pool settings
  waitForConnections: true,
  connectionLimit: 2, // Reduced to minimize startup connections
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000, // 30 seconds timeout
});

// Initialize drizzle with the connection pool
export const db = drizzle(poolConnection, { 
  schema,
  mode: 'default',
  logger: true // Enable query logging for debugging
});

// Export the pool for direct queries if needed
export const pool = poolConnection;

// Add connection test function with retry capability
export async function testConnection(retries = 3, delay = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt} of ${retries}...`);
      const connection = await poolConnection.getConnection();
      console.log('Database connection successful');
      connection.release();
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        console.log(`Retrying connection in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error(`Database connection failed after ${retries} attempts`);
  return false;
}
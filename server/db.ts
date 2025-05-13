import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to read database configuration
function getDbConfig() {
  try {
    // Hardcoded values from .env file
    const config = {
      host: 'dedi1350.jnb1.host-h.net',
      user: 'admin',
      password: '8E33U976qa800F',
      database: 'opianrewards',
      port: 3306
    };
    
    console.log('Using hardcoded database configuration from .env file');
    return config;
  } catch (error) {
    console.error('Error loading database configuration:', error);
    throw new Error('Failed to load database configuration');
  }
}

// Get the database configuration
const dbConfig = getDbConfig();

// Create a connection pool (more efficient than individual connections)
const pool = mysql.createPool({
  ...dbConfig,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Print database configuration (for debugging)
console.log('Database configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user ? 'Set' : 'Not set',
  password: dbConfig.password ? 'Set (hidden)' : 'Not set',
  database: dbConfig.database
});

// Export the pool for use across the application
export const connectionPool = pool;

// Legacy function that now returns a connection from the pool
export async function createConnection() {
  try {
    // Get a connection from the pool
    const connection = await pool.getConnection();
    
    // Test the connection
    await connection.query('SELECT 1');
    console.log('Successfully connected to MariaDB');
    
    // Replace the end method to release the connection instead of closing it
    const originalEnd = connection.end;
    connection.end = async function() {
      connection.release();
      return Promise.resolve();
    };
    
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
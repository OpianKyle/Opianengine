import mysql from 'mysql2/promise';

// Create a connection pool (more efficient than individual connections)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export the pool for use across the application
export const connectionPool = pool;

// Legacy function that now returns a connection from the pool
export async function createConnection() {
  try {
    // Ensure environment variables are loaded
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
      console.error('Missing database environment variables:',
        { 
          host: !!process.env.DB_HOST,
          user: !!process.env.DB_USER,
          password: !!process.env.DB_PASSWORD,
          database: !!process.env.DB_NAME
        }
      );
      throw new Error('Missing required database environment variables');
    }

    // Get a connection from the pool
    const connection = await pool.getConnection();
    
    // Test the connection
    await connection.query('SELECT 1');
    console.log('Successfully connected to MariaDB');
    
    // Release function will be automatically called when connection.end() is called
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
import mysql from 'mysql2/promise';

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

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test the connection
    await connection.query('SELECT 1');
    console.log('Successfully connected to MariaDB');
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database: ' + (error.message || 'Unknown error'));
  }
}
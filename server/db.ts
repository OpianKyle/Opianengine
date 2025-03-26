import mysql from 'mysql2/promise';
import { dbConfig } from './config';

export async function createConnection() {
  try {
    console.log('Starting database initialization...');
    const connection = await mysql.createConnection({
      ...dbConfig,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test the connection
    await connection.query('SELECT 1');
    console.log('MariaDB connection successful');
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    throw new Error('Failed to connect to MariaDB');
  }
}
// Test script for database connection
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    const dbConfig = {
      host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'opianrewards',
      port: parseInt(process.env.DB_PORT || '3306'),
      ssl: {
        rejectUnauthorized: false
      }
    };
    
    console.log('Using database config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      password: dbConfig.password ? 'PRESENT' : 'NOT SET',
    });
    
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('Database connection successful');
    await connection.end();
    return true;
  } catch (dbError) {
    console.error('Database connection test failed:', dbError);
    return false;
  }
}

testConnection();
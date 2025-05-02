/**
 * Run the migration to create leads table
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { up, down } from './migrations/0014_create_leads_table.js';

dotenv.config();

async function main() {
  console.log('Running leads table migration script...');
  
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  };
  
  console.log('Database configuration:', {
    host: dbConfig.host,
    user: dbConfig.user,
    hasPassword: !!dbConfig.password,
    database: dbConfig.database
  });
  
  let connection;
  
  try {
    console.log('Creating database connection...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Running migration up function...');
    await up(connection);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    console.log('Attempting to rollback migration...');
    
    if (connection) {
      try {
        await down(connection);
        console.log('Rollback completed successfully');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
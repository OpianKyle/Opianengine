/**
 * Run the migration to add missing columns to subscriptions table
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { up } from './migrations/0013_add_missing_columns_to_subscriptions.js';

// Load environment variables from .env file
dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
  });

  try {
    console.log('Connected to database');
    console.log('Running migration to add missing subscription columns...');
    
    await up(connection);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

main();
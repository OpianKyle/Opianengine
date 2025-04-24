/**
 * Run Cancelled At Migration Script
 * 
 * This script executes the migration to add the cancelled_at column to the subscriptions table.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { up } from '../migrations/0010_add_subscription_cancelled_at.js';

// Load environment variables
dotenv.config();

async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306
  });
}

async function runMigration() {
  console.log('Starting migration for adding cancelled_at column to subscriptions table');
  
  const connection = await createConnection();
  
  try {
    const result = await up(connection);
    console.log('Migration result:', result);
    
    if (result.success) {
      console.log('Migration completed successfully!');
    } else {
      console.error('Migration failed:', result.error);
    }
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await connection.end();
  }
}

// Run the migration
runMigration().catch(console.error);
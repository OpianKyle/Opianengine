/**
 * Run Subscription Cancelled At Migration Script
 * 
 * This script executes the migration to add the cancelled_at column to the subscriptions table.
 */

import mysql from 'mysql2/promise';
import { up } from '../migrations/0010_add_subscription_cancelled_at.js';
import dotenv from 'dotenv';

dotenv.config();

async function createConnection() {
  const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;
  
  if (!dbUrl) {
    throw new Error('No database URL found in environment variables');
  }
  
  // Create a connection using the URL
  return await mysql.createConnection(dbUrl);
}

async function runMigration() {
  let connection;
  
  try {
    console.log('Starting migration to add cancelled_at column to subscriptions table...');
    connection = await createConnection();
    
    // Run the migration
    await up(connection);
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
runMigration();
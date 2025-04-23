/**
 * Run Subscription Payment Dates Migration Script
 * 
 * This script executes the migration to add payment date fields to the subscriptions table.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import * as migration from '../migrations/0009_add_subscription_payment_dates.js';

dotenv.config();

async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'opianrewards',
    port: process.env.DB_PORT || 3306
  });
}

async function runMigration() {
  console.log('Starting subscription payment dates migration...');
  let connection;
  
  try {
    connection = await createConnection();
    console.log('Connected to database');
    
    await migration.up(connection);
    
    console.log('Migration completed successfully');
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
runMigration().catch(console.error);
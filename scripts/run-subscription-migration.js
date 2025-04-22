/**
 * Run Subscription Table Migration Script
 * 
 * This script executes the migration to create the subscriptions table.
 */

import mysql from 'mysql2/promise';
import path from 'path';
import { promises as fs } from 'fs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    ssl: {
      rejectUnauthorized: false
    }
  });
}

async function runMigration() {
  let connection;
  try {
    console.log('Starting subscription table migration...');
    
    // Create a database connection
    connection = await createConnection();
    console.log('Connected to database');
    
    // Import the migration file
    const migrationModule = await import('../migrations/0008_add_subscriptions_table.js');
    const { up } = migrationModule;
    
    // Run the migration
    await up(connection);
    
    console.log('Subscription table migration completed successfully');
    
    return true;
  } catch (error) {
    console.error('Error running subscription table migration:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(success => {
      if (success) {
        console.log('Migration completed successfully');
        process.exit(0);
      } else {
        console.error('Migration failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unexpected error during migration:', error);
      process.exit(1);
    });
}

export { runMigration };
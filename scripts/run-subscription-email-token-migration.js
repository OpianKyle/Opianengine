/**
 * Run Subscription Email Token Migration Script
 * 
 * This script executes the migration to add the paystack_email_token field to the subscriptions table.
 */

import * as mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { up as addEmailTokenMigration } from '../migrations/0010_add_subscription_email_token.js';

dotenv.config();

async function createConnection() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error('Missing database connection details in environment variables');
  }
  
  return await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true
  });
}

async function runMigration() {
  console.log('Starting subscription email token migration...');
  
  let connection;
  try {
    connection = await createConnection();
    console.log('Database connection established');
    
    const result = await addEmailTokenMigration(connection);
    
    if (result) {
      console.log('Migration completed successfully');
    } else {
      console.error('Migration did not complete successfully');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    if (connection) {
      console.log('Closing database connection');
      await connection.end();
    }
  }
}

// Run the migration
runMigration().catch(console.error);
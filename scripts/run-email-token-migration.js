/**
 * Run Email Token Migration Script
 * 
 * This script executes the migration to add the email_token column to the subscriptions table.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createConnection() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL || process.env.DB_URL
  });
  return connection;
}

async function runMigration() {
  let connection;
  
  try {
    connection = await createConnection();
    console.log('Connected to database');
    
    // Check if the column already exists
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM subscriptions LIKE 'email_token'
    `);
    
    if (columns.length > 0) {
      console.log('email_token column already exists, skipping migration');
      return;
    }
    
    // Add the email_token column
    await connection.query(`
      ALTER TABLE subscriptions
      ADD COLUMN email_token varchar(255) AFTER paystack_subscription_code
    `);
    
    console.log('Successfully added email_token column to subscriptions table');
    
    // Update the schema.ts file
    console.log('IMPORTANT: Remember to update the schema.ts file to include the email_token field!');
    
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
runMigration().catch(console.error);
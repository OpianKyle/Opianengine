/**
 * Run the subscription tables migration
 */

// Load environment variables
import 'dotenv/config';

// Create database connection
import mysql from 'mysql2/promise';

// Import the migrations
import * as subscriptionsMigration from './migrations/0011_create_subscriptions_table.js';
import * as cancellationsMigration from './migrations/0012_create_subscription_cancellations_table.js';

async function main() {
  console.log('Starting subscription tables migration runner...');
  
  // Create a connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // Start a transaction
    await connection.beginTransaction();
    
    // Run the subscriptions table migration
    console.log('Running subscriptions table migration...');
    await subscriptionsMigration.up(connection);
    
    // Run the subscription_cancellations table migration
    console.log('Running subscription cancellations table migration...');
    await cancellationsMigration.up(connection);
    
    // Commit the transaction
    await connection.commit();
    console.log('Migrations applied successfully!');
    
    // Verify tables
    const [tables] = await connection.execute(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name IN ('subscriptions', 'subscription_cancellations')
    `);
    
    console.log('Verification: tables created:', tables.map((t) => t.table_name));
    
  } catch (error) {
    console.error('Error running migrations:', error);
    await connection.rollback();
    console.log('Migrations rolled back due to error');
  } finally {
    await connection.end();
    console.log('Migration runner completed');
  }
}

main().catch(console.error);
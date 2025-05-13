/**
 * Script to run a specific migration
 */

// Load environment variables
import 'dotenv/config';

// Create database connection
import mysql from 'mysql2/promise';

// Import the migration
import * as migration from './migrations/0007_fix_referral_leads_signed_up_user_id.js';

async function main() {
  console.log('Starting migration runner...');
  
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
    
    // Run the migration
    console.log('Running migration up function...');
    await migration.up(connection);
    
    // Commit the transaction
    await connection.commit();
    console.log('Migration applied successfully!');
    
    // Check if the signed_up_user_id column exists
    const [columnCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'referral_leads' 
      AND column_name = 'signed_up_user_id'
    `);
    
    console.log(`Verification: signed_up_user_id column exists: ${columnCheck[0].count > 0 ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('Error running migration:', error);
    await connection.rollback();
    console.log('Migration rolled back due to error');
  } finally {
    await connection.end();
    console.log('Migration runner completed');
  }
}

main().catch(console.error);
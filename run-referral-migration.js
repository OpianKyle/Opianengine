/**
 * Run the migration to connect referrals with leads system
 */
import * as fs from 'fs';
import * as path from 'path';
import { createConnection } from './server/db.js';

async function main() {
  try {
    console.log('Starting referral leads integration migration');
    const connection = await createConnection();
    
    console.log('Connected to database');
    
    // Import the migration module
    const migrationModule = await import('./migrations/0012_update_leads_referral_connection.js');
    const { up } = migrationModule;
    
    // Run the up function with the database connection
    await up(connection);
    
    console.log('Migration completed successfully');
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Migration failed with error:', error);
    process.exit(1);
  }
}

// Run the migration
main();
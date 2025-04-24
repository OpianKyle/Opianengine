/**
 * Run the new subscription_status field migration
 */
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { up } from './migrations/0009_add_subscription_status_field.js';

dotenv.config();

async function main() {
  try {
    console.log('Starting database migration for subscription_status field...');
    
    // Create database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    });
    
    console.log('Connected to database successfully');
    
    // Run migration
    await up(connection);
    
    console.log('Migration completed successfully');
    
    // Close connection
    await connection.end();
    
    console.log('Database connection closed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();
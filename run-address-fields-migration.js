/**
 * Run the migration to add address fields to users table
 */
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { up } from './migrations/0008_add_address_fields.js';
import dotenv from 'dotenv';

async function main() {
  // Load environment variables
  dotenv.config();

  // Database connection
  const connectionString = process.env.DATABASE_URL;
  
  console.log('Connecting to database...');
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable not found');
    process.exit(1);
  }
  
  try {
    const connection = await mysql.createConnection(connectionString);
    const db = drizzle(connection);
    
    console.log('Running migration to add address fields...');
    await up(db);
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

main();
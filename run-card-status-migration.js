/**
 * Run the migration to add card status field to users table
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { up } from './migrations/0011_add_card_status_field.js';

// Load environment variables
dotenv.config();

async function main() {
  console.log('Starting migration to add card status field to users table...');
  
  try {
    // Create database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'opianrewards'
    });
    
    // Run migration
    await up(connection);
    
    // Close connection
    await connection.end();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
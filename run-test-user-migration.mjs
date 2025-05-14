/**
 * Run the migration to add the is_test field to users table
 * This allows for identifying test users and excluding them from statistics
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function runMigration() {
  console.log('Running migration to add is_test field to users table...');
  
  let connection;
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    // Add is_test field to users table with default false
    await connection.execute(`
      ALTER TABLE users
      ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // Update existing test users (using pattern matching on email domains)
    await connection.execute(`
      UPDATE users
      SET is_test = TRUE
      WHERE email LIKE '%@testuser.com' OR email LIKE '%@testemail.com' OR email LIKE '%@example.com'
    `);
    
    console.log('✅ Migration completed successfully: Added is_test field to users table');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
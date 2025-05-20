/**
 * Run the migration to add cash deposits functionality
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting cash deposits migration...');

  // Get database credentials from environment variables
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'opianrewards',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
  };

  try {
    // Create a connection to the database
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to the database');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_cash_deposits_table.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    console.log('Executing migration...');
    await connection.query(migration);

    console.log('Migration completed successfully');

    // Close the connection
    await connection.end();
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
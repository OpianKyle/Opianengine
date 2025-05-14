/**
 * Run the migration to add the social user type to the database
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Set up __dirname equivalent for ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load environment variables
dotenv.config();

async function main() {
  console.log('Starting migration to add social user type');
  
  // Create a database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'opianrewards'
  });
  
  try {
    // Import the migration
    const migration = require('./migrations/0006_add_social_users');
    
    // Run the migration
    await migration.up(connection);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await connection.end();
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
/**
 * Run the migration to add the is_test field to users table
 * This allows for identifying test users and excluding them from statistics
 */
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Running migration to add is_test field to users table...');
  
  try {
    // Import the migration
    const { up } = await import('./migrations/0007_add_test_user_field.js');
    
    // Create database connection
    const connection = await createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    // Run migration
    await up(connection);
    
    console.log('Migration completed successfully');
    
    // Close connection
    await connection.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
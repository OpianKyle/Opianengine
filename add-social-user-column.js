/**
 * Direct script to add is_social column to the users table
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('Starting direct migration to add is_social column');
  
  // Create a database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'opianrewards',
    password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
    database: process.env.DB_NAME || 'opianrewards'
  });
  
  try {
    // Check if the column already exists
    console.log('Checking if is_social column exists...');
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM users LIKE 'is_social'"
    );
    
    if (Array.isArray(columns) && columns.length === 0) {
      // Add is_social column
      console.log('Adding is_social column to users table...');
      await connection.execute(
        "ALTER TABLE users ADD COLUMN is_social BOOLEAN NOT NULL DEFAULT FALSE"
      );
      console.log("✅ Successfully added is_social column to users table");
    } else {
      console.log("✅ Column is_social already exists in users table");
    }
    
    // Verify the column was added
    const [verifyColumns] = await connection.execute(
      "SHOW COLUMNS FROM users LIKE 'is_social'"
    );
    
    if (Array.isArray(verifyColumns) && verifyColumns.length > 0) {
      console.log("Verification successful: is_social column exists");
      console.log("Column details:", verifyColumns[0]);
    } else {
      console.log("⚠️ Verification failed: is_social column could not be found");
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

// Run the main function
main()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
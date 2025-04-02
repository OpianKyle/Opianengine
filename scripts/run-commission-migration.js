const mysql = require('mysql2/promise');
require('dotenv').config();

// Import migrations
const { up } = require('../migrations/0005_update_commission_package_types');

// Create connection and run migration
async function runMigration() {
  console.log('Starting commission migration script...');
  
  // Create connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });
  
  try {
    console.log('Connected to database');
    
    // Run the migration
    console.log('Running up migration...');
    await up(connection);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close connection
    await connection.end();
    console.log('Database connection closed');
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Failed to run migration:', err);
  process.exit(1);
});
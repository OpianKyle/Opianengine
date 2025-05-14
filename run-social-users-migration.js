/**
 * Run the migration to add the social user type to the database
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

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
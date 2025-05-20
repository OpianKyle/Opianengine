/**
 * Run the migration to add cash wallet functionality
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('Running cash wallet migration script...');

  // Create database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('Connected to database');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_cash_wallet_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing SQL migration...');
    await connection.query(sql);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
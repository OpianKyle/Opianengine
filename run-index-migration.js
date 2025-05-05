/**
 * Run the migration to add database indexes for performance improvement
 */
import { createPool } from 'mysql2/promise';
import 'dotenv/config';
import { up } from './migrations/0015_add_database_indexes.js';

async function main() {
  console.log('Starting database index migration...');
  
  const pool = createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
  });
  
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database, applying indexes...');
    
    await up(connection);
    
    console.log('Indexes added successfully!');
    connection.release();
  } catch (error) {
    console.error('Error applying indexes:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
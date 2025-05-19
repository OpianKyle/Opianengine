/**
 * Run the migration to add card number field to users table
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Get current file directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting card number field migration...');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'opian',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const connection = await pool.getConnection();
    console.log('Connected to database successfully.');

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'card_number'
    `);

    if (columns.length > 0) {
      console.log('Card number field already exists in users table.');
    } else {
      console.log('Adding card_number field to users table...');
      const migrationFile = path.join(__dirname, 'migrations', 'add_card_number_field.sql');
      const sql = fs.readFileSync(migrationFile, 'utf8');
      
      await connection.query(sql);
      console.log('Migration completed successfully!');
    }

    connection.release();
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
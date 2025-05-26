/**
 * Add missing profile fields to users table
 */
import mysql from 'mysql2/promise';

async function createConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'opian_rewards'
  });
  return connection;
}

async function addProfileFields() {
  let connection;
  try {
    connection = await createConnection();
    
    console.log('Adding missing profile fields to users table...');
    
    const fieldsToAdd = [
      'ADD COLUMN IF NOT EXISTS address VARCHAR(255) DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS suburb VARCHAR(100) DEFAULT NULL', 
      'ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10) DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS id_number VARCHAR(20) DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS date_of_birth DATE DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS industry VARCHAR(100) DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS occupation VARCHAR(100) DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS is_south_african BOOLEAN DEFAULT FALSE',
      'ADD COLUMN IF NOT EXISTS selected_package VARCHAR(20) DEFAULT "BEGINNER"',
      'ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS account_type ENUM("SAVINGS", "CHEQUE", "TRANSMISSION") DEFAULT "SAVINGS"',
      'ADD COLUMN IF NOT EXISTS account_number VARCHAR(20) DEFAULT NULL',
      'ADD COLUMN IF NOT EXISTS has_credit_card BOOLEAN DEFAULT FALSE'
    ];
    
    for (const field of fieldsToAdd) {
      try {
        await connection.execute(`ALTER TABLE users ${field}`);
        console.log(`✓ Added: ${field}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`- Already exists: ${field}`);
        } else {
          console.error(`✗ Error adding ${field}:`, error.message);
        }
      }
    }
    
    console.log('Profile fields migration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

addProfileFields();
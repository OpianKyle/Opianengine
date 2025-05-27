/**
 * Add referral columns to leads table and populate with existing data
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  return connection;
}

async function addReferralColumns() {
  let connection;
  
  try {
    connection = await createConnection();
    console.log('Connected to database');
    
    // Check if columns already exist
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leads' 
      AND COLUMN_NAME IN ('referred_by_name', 'referred_by_email')
    `, [process.env.DB_NAME]);
    
    if (columns.length === 0) {
      console.log('Adding referral columns to leads table...');
      
      // Add the referral columns
      await connection.execute(`
        ALTER TABLE leads 
        ADD COLUMN referred_by_name VARCHAR(255) NULL,
        ADD COLUMN referred_by_email VARCHAR(255) NULL
      `);
      
      console.log('✓ Added referral columns to leads table');
    } else {
      console.log('Referral columns already exist');
    }
    
    // Now populate the referral data by joining with users table
    console.log('Populating referral data...');
    
    const [updateResult] = await connection.execute(`
      UPDATE leads l
      JOIN users u ON l.referral_code = u.referral_code
      SET 
        l.referred_by_name = CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
        l.referred_by_email = u.email
      WHERE l.referral_code IS NOT NULL AND l.referral_code != ''
    `);
    
    console.log(`✓ Updated ${updateResult.affectedRows} leads with referral information`);
    
    // Show some results
    const [results] = await connection.execute(`
      SELECT first_name, last_name, email, referral_code, referred_by_name, referred_by_email
      FROM leads 
      WHERE referred_by_name IS NOT NULL 
      LIMIT 10
    `);
    
    console.log('\nSample leads with referral information:');
    results.forEach(lead => {
      console.log(`- ${lead.first_name} ${lead.last_name} (${lead.email}) referred by ${lead.referred_by_name} (${lead.referred_by_email})`);
    });
    
    console.log('\nReferral columns added and populated successfully!');
    
  } catch (error) {
    console.error('Error adding referral columns:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the migration
addReferralColumns()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
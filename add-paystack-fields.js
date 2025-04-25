/**
 * Script to add only the missing Paystack fields
 */

// Load environment variables
import 'dotenv/config';

// Create database connection
import mysql from 'mysql2/promise';

async function main() {
  console.log('Starting script to add missing Paystack fields...');
  
  // Create a connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // Start a transaction
    await connection.beginTransaction();
    
    // Check which columns exist
    console.log('Checking existing columns...');
    
    // Get all columns from users table
    const [columns] = await connection.execute(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'users'
    `);
    
    const columnNames = columns.map(col => col.column_name.toLowerCase());
    console.log('Existing columns:', columnNames);
    
    // Add paystack_customer_code if it doesn't exist
    if (!columnNames.includes('paystack_customer_code')) {
      console.log('Adding paystack_customer_code column...');
      await connection.execute(`ALTER TABLE users ADD COLUMN paystack_customer_code VARCHAR(255) NULL`);
    } else {
      console.log('Column paystack_customer_code already exists');
    }
    
    // Add paystack_subscription_code if it doesn't exist
    if (!columnNames.includes('paystack_subscription_code')) {
      console.log('Adding paystack_subscription_code column...');
      await connection.execute(`ALTER TABLE users ADD COLUMN paystack_subscription_code VARCHAR(255) NULL`);
    } else {
      console.log('Column paystack_subscription_code already exists');
    }
    
    // Add paystack_email_token if it doesn't exist
    if (!columnNames.includes('paystack_email_token')) {
      console.log('Adding paystack_email_token column...');
      await connection.execute(`ALTER TABLE users ADD COLUMN paystack_email_token VARCHAR(255) NULL`);
    } else {
      console.log('Column paystack_email_token already exists');
    }
    
    // Add subscription_start_date if it doesn't exist
    if (!columnNames.includes('subscription_start_date')) {
      console.log('Adding subscription_start_date column...');
      await connection.execute(`ALTER TABLE users ADD COLUMN subscription_start_date DATETIME NULL`);
    } else {
      console.log('Column subscription_start_date already exists');
    }
    
    // Add subscription_end_date if it doesn't exist
    if (!columnNames.includes('subscription_end_date')) {
      console.log('Adding subscription_end_date column...');
      await connection.execute(`ALTER TABLE users ADD COLUMN subscription_end_date DATETIME NULL`);
    } else {
      console.log('Column subscription_end_date already exists');
    }
    
    // Commit the transaction
    await connection.commit();
    console.log('All missing columns added successfully!');
    
    // Check if the columns were added
    const [verifyColumns] = await connection.execute(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'users'
      AND column_name IN ('paystack_customer_code', 'paystack_subscription_code', 'paystack_email_token')
    `);
    
    console.log('Verification: Paystack columns exist:', verifyColumns.map(c => c.column_name));
    
  } catch (error) {
    console.error('Error running script:', error);
    await connection.rollback();
    console.log('Changes rolled back due to error');
  } finally {
    await connection.end();
    console.log('Script completed');
  }
}

main().catch(console.error);
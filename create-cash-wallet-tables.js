/**
 * Create cash wallet tables directly using SQL
 */
import { pool } from './db/index.js';

async function createCashWalletTables() {
  console.log('Creating cash wallet tables...');
  
  try {
    const connection = await pool.getConnection();
    
    try {
      // Create cash_wallet_transactions table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cash_wallet_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          description VARCHAR(255) NOT NULL,
          transaction_type ENUM('CREDIT', 'DEBIT') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('Created cash_wallet_transactions table');
      
      // Add cash_balance column to users table if it doesn't exist
      await connection.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(10,2) DEFAULT 0.00;
      `);
      console.log('Added cash_balance column to users table');
      
      // Create indexes for faster queries
      await connection.query(`
        CREATE INDEX IF NOT EXISTS idx_cash_wallet_user_id ON cash_wallet_transactions(user_id);
      `);
      await connection.query(`
        CREATE INDEX IF NOT EXISTS idx_cash_wallet_created_at ON cash_wallet_transactions(created_at);
      `);
      console.log('Created indexes for cash wallet tables');
      
      console.log('Successfully created all cash wallet tables and columns');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating cash wallet tables:', error);
  }
}

createCashWalletTables().catch(console.error);
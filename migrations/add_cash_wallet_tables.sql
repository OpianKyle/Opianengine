-- Create cash_wallet_transactions table
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

-- Add cash_balance column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(10,2) DEFAULT 0.00;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cash_wallet_user_id ON cash_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_wallet_created_at ON cash_wallet_transactions(created_at);
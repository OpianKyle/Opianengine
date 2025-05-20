-- Create cash_wallet table for tracking customer cash deposits
CREATE TABLE IF NOT EXISTS cash_wallet (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add cash_balance column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(10,2) DEFAULT 0.00;
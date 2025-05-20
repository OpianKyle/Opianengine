-- Create cash_deposits table
CREATE TABLE IF NOT EXISTS cash_deposits (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  points INT NOT NULL,
  cash_value DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cash_deposits_user_id (user_id)
);

-- Add cash_deposits column to users table
ALTER TABLE users
ADD COLUMN cash_deposits DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
-- Add card_number field to users table
ALTER TABLE users ADD COLUMN card_number VARCHAR(255) DEFAULT NULL;
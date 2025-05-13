import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "./schema";

async function runMigration() {
  try {
    console.log('Starting database migration...');

    const poolConnection = mysql.createPool({
      host: 'dedi1350.jnb1.host-h.net',
      user: 'admin',
      password: '8E33U976qa800F',
      database: 'opianrewards',
      port: 3306,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Initialize drizzle with mode parameter
    const db = drizzle(poolConnection, { 
      schema, 
      mode: 'default',
      logger: true 
    });

    // Migration SQL queries
    const migrationQueries = [
      // Check if agent_commissions table exists
      `CREATE TABLE IF NOT EXISTS agent_commissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id INT NOT NULL,
        customer_id INT NOT NULL,
        commission_type ENUM('SIGNUP', 'RENEWAL') NOT NULL,
        package_type ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL,
        premium_amount DECIMAL(10,2) NOT NULL,
        commission_percentage DECIMAL(5,2) NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        status ENUM('PENDING', 'PAID') DEFAULT 'PENDING' NOT NULL,
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      
      // Create referral_leads table if not exists
      `CREATE TABLE IF NOT EXISTS referral_leads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        referral_code TEXT NOT NULL,
        notes TEXT,
        status ENUM('NEW', 'CONTACTED', 'SIGNED_UP', 'NOT_INTERESTED') DEFAULT 'NEW' NOT NULL,
        signed_up_user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (signed_up_user_id) REFERENCES users(id) ON DELETE SET NULL
      );`,
      
      // Check if signed_up_user_id column exists and add it if not (fix for referral system)
      `SELECT COUNT(*) INTO @col_exists 
       FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'referral_leads' 
       AND column_name = 'signed_up_user_id';`,
      
      `SET @add_column = IF(@col_exists = 0, 
        'ALTER TABLE referral_leads ADD COLUMN signed_up_user_id INT, ADD CONSTRAINT fk_referral_leads_signed_up_user FOREIGN KEY (signed_up_user_id) REFERENCES users(id) ON DELETE SET NULL', 
        'SELECT 1');`,
      
      `PREPARE add_column_stmt FROM @add_column;`,
      `EXECUTE add_column_stmt;`,
      `DEALLOCATE PREPARE add_column_stmt;`,
      
      // Update transaction type to include COMMISSION
      `ALTER TABLE transactions MODIFY COLUMN type 
       ENUM('REWARD_REDEMPTION', 'PRODUCT_PURCHASE', 'ADMIN_ADJUSTMENT', 'WELCOME_BONUS', 'REFERRAL_BONUS', 'COMMISSION') NOT NULL`,
      
      // Update any agent_commissions records with old package types
      `UPDATE agent_commissions SET package_type = 'OPPORTUNITY' 
       WHERE package_type IN ('BASIC', 'STANDARD') 
       AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')`,
       
      `UPDATE agent_commissions SET package_type = 'PROSPER' 
       WHERE package_type = 'PREMIUM' 
       AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')`,
       
      `UPDATE agent_commissions SET package_type = 'PRESTIGE' 
       WHERE package_type = 'ELITE' 
       AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')`,
       
      `UPDATE agent_commissions SET package_type = 'PINNACLE' 
       WHERE package_type = 'EXECUTIVE' 
       AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')`
    ];

    console.log('Running migrations...');
    for (const query of migrationQueries) {
      try {
        await poolConnection.query(query);
        console.log('Successfully executed query:', query.substring(0, 100) + '...');
      } catch (error) {
        // Log the full error details for debugging
        console.error('Error executing query:', query);
        console.error('Error details:', error);
        throw error;
      }
    }

    console.log('Migration completed successfully');
    await poolConnection.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
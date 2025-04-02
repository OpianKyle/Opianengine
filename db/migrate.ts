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
        package_type ENUM('BASIC', 'STANDARD', 'PREMIUM', 'ELITE', 'EXECUTIVE') NOT NULL,
        premium_amount INT NOT NULL,
        commission_percentage INT NOT NULL,
        commission_amount INT NOT NULL,
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
      );`
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
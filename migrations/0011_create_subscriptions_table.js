/**
 * Migration to create subscriptions and subscription_cancellations tables
 * 
 * This migration:
 * 1. Creates a new subscriptions table to store subscription data
 * 2. Creates a subscription_cancellations table to track cancellation reasons
 */

export async function up(db) {
  console.log('Running migration to create subscription tables');

  try {
    // Check if subscriptions table exists
    const [subscriptionTables] = await db.query(`
      SHOW TABLES LIKE 'subscriptions'
    `);

    if (subscriptionTables.length === 0) {
      // Create subscriptions table
      await db.query(`
        CREATE TABLE subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          package_type ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL,
          subscription_code VARCHAR(255) NULL,
          customer_code VARCHAR(255) NULL,
          email_token VARCHAR(255) NULL,
          status VARCHAR(50) DEFAULT 'active',
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'ZAR',
          payment_reference VARCHAR(255) NULL,
          start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          end_date DATETIME NULL,
          next_payment_date DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Created subscriptions table');
    } else {
      // If table exists but columns are missing, add them
      try {
        const [subscriptionColumns] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'subscription_code'`);
        
        if (subscriptionColumns.length === 0) {
          // Add missing columns to existing table
          await db.query(`
            ALTER TABLE subscriptions 
            ADD COLUMN subscription_code VARCHAR(255) NULL,
            ADD COLUMN customer_code VARCHAR(255) NULL,
            ADD COLUMN email_token VARCHAR(255) NULL
          `);
          console.log('Added Paystack subscription columns to existing subscriptions table');
        }
      } catch (error) {
        console.error('Error checking/adding subscription columns:', error);
        throw error;
      }
    }

    // Check if subscription_cancellations table exists
    const [cancellationTables] = await db.query(`
      SHOW TABLES LIKE 'subscription_cancellations'
    `);

    if (cancellationTables.length === 0) {
      // Create subscription_cancellations table
      await db.query(`
        CREATE TABLE subscription_cancellations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          subscription_id INT NOT NULL,
          user_id INT NOT NULL,
          reason VARCHAR(255) NULL,
          additional_feedback TEXT NULL,
          is_admin_cancelled BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Created subscription_cancellations table');
    }

    console.log('Subscription tables migration completed successfully');
  } catch (error) {
    console.error('Error in subscription tables migration:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Running migration to drop subscription tables');

  try {
    // Drop subscription_cancellations table
    await db.query(`
      DROP TABLE IF EXISTS subscription_cancellations
    `);
    
    // Drop subscriptions table
    await db.query(`
      DROP TABLE IF EXISTS subscriptions
    `);
    
    console.log('Subscription tables dropped successfully');
  } catch (error) {
    console.error('Error dropping subscription tables:', error);
    throw error;
  }
}
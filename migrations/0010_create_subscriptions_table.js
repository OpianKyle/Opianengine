/**
 * Migration to create subscriptions and subscription_cancellations tables
 * 
 * This migration:
 * 1. Creates a new subscriptions table to store subscription data
 * 2. Creates a subscription_cancellations table to track cancellation reasons
 * 3. Adds the missing selectedPackage column to users table
 */

export async function up(db) {
  try {
    console.log('Running migration to create subscription tables...');

    // Add selectedPackage column to users table if it doesn't exist
    const [userColumns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'selectedPackage'
    `);

    if (userColumns.length === 0) {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN selectedPackage ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') DEFAULT NULL
      `);
      console.log('Added selectedPackage column to users table');
    } else {
      console.log('selectedPackage column already exists in users table. Skipping.');
    }

    // Check if subscriptions table already exists
    const [subscriptionsExists] = await db.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_NAME = 'subscriptions'
    `);

    if (subscriptionsExists.length === 0) {
      // Create subscriptions table
      await db.query(`
        CREATE TABLE subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          package_type ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL,
          status ENUM('active', 'inactive', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
          paystack_customer_code VARCHAR(255),
          paystack_subscription_code VARCHAR(255),
          paystack_email_token VARCHAR(255),
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'ZAR',
          interval_type ENUM('monthly', 'quarterly', 'annual') NOT NULL DEFAULT 'monthly',
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Created subscriptions table');
    } else {
      console.log('Subscriptions table already exists. Skipping.');
    }

    // Check if subscription_cancellations table already exists
    const [cancellationsExists] = await db.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_NAME = 'subscription_cancellations'
    `);

    if (cancellationsExists.length === 0) {
      // Create subscription_cancellations table
      await db.query(`
        CREATE TABLE subscription_cancellations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          subscription_id INT NOT NULL,
          reason TEXT,
          cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          cancelled_by INT NOT NULL,
          is_admin_cancelled BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
          FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Created subscription_cancellations table');
    } else {
      console.log('Subscription_cancellations table already exists. Skipping.');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error in migration:', error);
    return Promise.reject(error);
  }
}

export async function down(db) {
  try {
    console.log('Reverting migration...');
    
    // Drop subscription_cancellations table if it exists
    const [cancellationsExists] = await db.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_NAME = 'subscription_cancellations'
    `);

    if (cancellationsExists.length > 0) {
      await db.query(`DROP TABLE subscription_cancellations`);
      console.log('Dropped subscription_cancellations table');
    }
    
    // Drop subscriptions table if it exists
    const [subscriptionsExists] = await db.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_NAME = 'subscriptions'
    `);

    if (subscriptionsExists.length > 0) {
      await db.query(`DROP TABLE subscriptions`);
      console.log('Dropped subscriptions table');
    }
    
    // Drop selectedPackage column from users table if it exists
    const [userColumns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'selectedPackage'
    `);

    if (userColumns.length > 0) {
      await db.query(`
        ALTER TABLE users 
        DROP COLUMN selectedPackage
      `);
      console.log('Dropped selectedPackage column from users table');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error in migration:', error);
    return Promise.reject(error);
  }
}
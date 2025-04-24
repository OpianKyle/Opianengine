/**
 * Migration to create the subscriptions table
 * 
 * This migration creates a dedicated table for tracking subscription details
 * including payment history, renewal dates, and subscription status changes.
 */

export async function up(db) {
  try {
    console.log('Running migration to create subscriptions table...');

    // Check if table already exists
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'subscriptions' 
      AND TABLE_SCHEMA = DATABASE()
    `);

    if (tables.length === 0) {
      // Create subscriptions table if it doesn't exist
      await db.query(`
        CREATE TABLE subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          paystack_subscription_code VARCHAR(255),
          paystack_customer_code VARCHAR(255),
          paystack_email_token VARCHAR(255),
          package_type ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          status ENUM('active', 'inactive', 'cancelled', 'expired', 'pending') NOT NULL DEFAULT 'pending',
          start_date DATETIME,
          end_date DATETIME,
          next_payment_date DATETIME,
          last_payment_date DATETIME,
          payment_method VARCHAR(100) DEFAULT 'paystack',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Created subscriptions table.');
    } else {
      console.log('Subscriptions table already exists. Skipping.');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error in migration:', error);
    return Promise.reject(error);
  }
}

export async function down(db) {
  try {
    console.log('Reverting migration to drop subscriptions table...');
    
    // Check if table exists before trying to drop it
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'subscriptions' 
      AND TABLE_SCHEMA = DATABASE()
    `);

    if (tables.length > 0) {
      await db.query(`DROP TABLE subscriptions`);
      console.log('Dropped subscriptions table.');
    } else {
      console.log('Subscriptions table does not exist. Skipping.');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error in migration:', error);
    return Promise.reject(error);
  }
}
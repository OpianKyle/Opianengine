/**
 * Migration to create the subscription_cancellations table
 * 
 * This migration creates a table to track subscription cancellation details
 * including the reason for cancellation, who cancelled it, and when.
 */

export async function up(db) {
  try {
    console.log('Running migration to create subscription_cancellations table...');

    // Check if table already exists
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'subscription_cancellations' 
      AND TABLE_SCHEMA = DATABASE()
    `);

    if (tables.length === 0) {
      // Create subscription_cancellations table if it doesn't exist
      await db.query(`
        CREATE TABLE subscription_cancellations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          subscription_id INT NOT NULL,
          user_id INT NOT NULL,
          reason TEXT,
          additional_feedback TEXT,
          cancellation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_admin_cancelled BOOLEAN DEFAULT FALSE,
          admin_id INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      console.log('Created subscription_cancellations table.');
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
    console.log('Reverting migration to drop subscription_cancellations table...');
    
    // Check if table exists before trying to drop it
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'subscription_cancellations' 
      AND TABLE_SCHEMA = DATABASE()
    `);

    if (tables.length > 0) {
      await db.query(`DROP TABLE subscription_cancellations`);
      console.log('Dropped subscription_cancellations table.');
    } else {
      console.log('Subscription_cancellations table does not exist. Skipping.');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error in migration:', error);
    return Promise.reject(error);
  }
}
/**
 * Migration to create the subscription_cancellations table
 * 
 * This migration creates a table to track subscription cancellation details
 * including the reason for cancellation, who cancelled it, and when.
 */

export async function up(db) {
  console.log('Running migration to create subscription_cancellations table');

  try {
    // Check if table already exists
    const [tables] = await db.query(`
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'subscription_cancellations'
    `);

    if (tables.length === 0) {
      // Create subscription_cancellations table
      const createTableSql = `
        CREATE TABLE subscription_cancellations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          subscription_id INT NOT NULL,
          user_id INT NOT NULL,
          reason VARCHAR(255) NOT NULL,
          additional_feedback TEXT,
          is_admin_cancelled BOOLEAN DEFAULT FALSE,
          admin_id INT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `;

      await db.query(createTableSql);
      console.log('Successfully created subscription_cancellations table');
    } else {
      console.log('Subscription_cancellations table already exists');
    }
  } catch (error) {
    console.error('Error creating subscription_cancellations table:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Running migration to drop subscription_cancellations table');

  try {
    // Check if table exists
    const [tables] = await db.query(`
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'subscription_cancellations'
    `);

    if (tables.length > 0) {
      // Drop table
      await db.query('DROP TABLE IF EXISTS subscription_cancellations');
      console.log('Successfully dropped subscription_cancellations table');
    } else {
      console.log('Subscription_cancellations table does not exist');
    }
  } catch (error) {
    console.error('Error dropping subscription_cancellations table:', error);
    throw error;
  }
}
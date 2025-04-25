/**
 * Migration to create the subscriptions table
 * 
 * This migration creates a dedicated table for tracking subscription details
 * including payment history, renewal dates, and subscription status changes.
 */

export async function up(db) {
  console.log('Running migration to create subscriptions table');

  try {
    // Check if table already exists
    const [tables] = await db.query(`
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'subscriptions'
    `);

    if (tables.length === 0) {
      // Create subscriptions table
      const createTableSql = `
        CREATE TABLE subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          package_type VARCHAR(50) NOT NULL,
          subscription_code VARCHAR(255) NOT NULL,
          customer_code VARCHAR(255) NOT NULL,
          email_token VARCHAR(255),
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'ZAR',
          payment_reference VARCHAR(255),
          start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          end_date DATETIME,
          next_payment_date DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;

      await db.query(createTableSql);
      console.log('Successfully created subscriptions table');
    } else {
      console.log('Subscriptions table already exists');
    }
  } catch (error) {
    console.error('Error creating subscriptions table:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Running migration to drop subscriptions table');

  try {
    // Check if table exists
    const [tables] = await db.query(`
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'subscriptions'
    `);

    if (tables.length > 0) {
      // Drop table
      await db.query('DROP TABLE IF EXISTS subscriptions');
      console.log('Successfully dropped subscriptions table');
    } else {
      console.log('Subscriptions table does not exist');
    }
  } catch (error) {
    console.error('Error dropping subscriptions table:', error);
    throw error;
  }
}
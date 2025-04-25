/**
 * Migration to add Paystack subscription fields to users table
 * 
 * This migration adds fields to store Paystack subscription data including:
 * - paystack_customer_code
 * - paystack_subscription_code
 * - paystack_email_token
 * - subscription_status
 * - subscription_start_date
 * - subscription_end_date
 */

export async function up(db) {
  console.log('Running migration to add Paystack subscription fields');

  try {
    // Check if columns already exist
    const checkColumnSql = `SHOW COLUMNS FROM users LIKE 'paystack_customer_code'`;
    const [columns] = await db.query(checkColumnSql);

    if (columns.length === 0) {
      // Add new columns for Paystack subscription data
      const alterTableSql = `
        ALTER TABLE users
        ADD COLUMN paystack_customer_code VARCHAR(255) NULL,
        ADD COLUMN paystack_subscription_code VARCHAR(255) NULL,
        ADD COLUMN paystack_email_token VARCHAR(255) NULL,
        ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'inactive',
        ADD COLUMN subscription_start_date DATETIME NULL,
        ADD COLUMN subscription_end_date DATETIME NULL
      `;

      await db.query(alterTableSql);
      console.log('Successfully added Paystack subscription fields to users table');
    } else {
      console.log('Paystack subscription fields already exist in users table');
    }
  } catch (error) {
    console.error('Error adding Paystack subscription fields:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Running migration to remove Paystack subscription fields');

  try {
    // Check if columns exist
    const checkColumnSql = `SHOW COLUMNS FROM users LIKE 'paystack_customer_code'`;
    const [columns] = await db.query(checkColumnSql);

    if (columns.length > 0) {
      // Remove columns for Paystack subscription data
      const alterTableSql = `
        ALTER TABLE users
        DROP COLUMN paystack_customer_code,
        DROP COLUMN paystack_subscription_code,
        DROP COLUMN paystack_email_token,
        DROP COLUMN subscription_status,
        DROP COLUMN subscription_start_date,
        DROP COLUMN subscription_end_date
      `;

      await db.query(alterTableSql);
      console.log('Successfully removed Paystack subscription fields from users table');
    } else {
      console.log('Paystack subscription fields do not exist in users table');
    }
  } catch (error) {
    console.error('Error removing Paystack subscription fields:', error);
    throw error;
  }
}
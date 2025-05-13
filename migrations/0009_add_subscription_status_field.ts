/**
 * Migration to add subscription_status field to users table
 * 
 * This migration adds the subscription_status field which was missing
 * from the previous migration that added Paystack subscription fields.
 */

export async function up(db: any) {
  try {
    console.log('Running migration to add subscription_status field...');

    // Check if the column already exists before trying to add it
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'subscription_status'
    `);

    if (columns.length === 0) {
      // Add subscription_status field if it doesn't exist
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN subscription_status ENUM('active', 'inactive', 'expired', 'cancelled') DEFAULT NULL
      `);
      console.log('Added subscription_status field to users table.');
    } else {
      console.log('subscription_status field already exists in users table. Skipping.');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error in migration:', error);
    return Promise.reject(error);
  }
}

export async function down(db: any) {
  try {
    console.log('Reverting migration to remove subscription_status field...');
    
    // Check if the column exists before trying to drop it
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'subscription_status'
    `);

    if (columns.length > 0) {
      await db.query(`
        ALTER TABLE users 
        DROP COLUMN subscription_status
      `);
      console.log('Removed subscription_status field from users table.');
    } else {
      console.log('subscription_status field does not exist in users table. Skipping.');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error in migration:', error);
    return Promise.reject(error);
  }
}
/**
 * Migration to add email_token field to subscriptions table
 * 
 * This field is required for reactivating subscriptions in Paystack
 */

export async function up(db) {
  console.log('Running migration: add email_token to subscriptions table');
  
  try {
    // Check if column already exists
    const [checkResult] = await db.execute(`
      SELECT COUNT(*) as column_exists
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'subscriptions'
      AND COLUMN_NAME = 'paystack_email_token'
    `);
    
    if (checkResult[0].column_exists === 0) {
      await db.execute(`
        ALTER TABLE subscriptions
        ADD COLUMN paystack_email_token VARCHAR(255) NULL AFTER paystack_subscription_code
      `);
      console.log('Successfully added paystack_email_token column to subscriptions table');
    } else {
      console.log('Column paystack_email_token already exists in subscriptions table');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding paystack_email_token column to subscriptions table:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Running down migration: remove email_token from subscriptions table');
  
  try {
    await db.execute(`
      ALTER TABLE subscriptions 
      DROP COLUMN IF EXISTS paystack_email_token
    `);
    console.log('Successfully removed paystack_email_token column from subscriptions table');
    
    return true;
  } catch (error) {
    console.error('Error removing paystack_email_token column from subscriptions table:', error);
    throw error;
  }
}
export async function up(db) {
  console.log('Running migration: add subscription payment dates');
  
  try {
    // Add last_payment_date and next_payment_date columns
    await db.execute(`
      ALTER TABLE subscriptions 
      ADD COLUMN last_payment_date DATETIME NULL,
      ADD COLUMN next_payment_date DATETIME NULL,
      ADD COLUMN paystack_subscription_code VARCHAR(255) NULL,
      ADD COLUMN paystack_customer_code VARCHAR(255) NULL
    `);
    
    console.log('Successfully added payment date columns to subscriptions table');
    
    return true;
  } catch (error) {
    console.error('Error adding payment date columns:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Running down migration: remove subscription payment dates');
  
  try {
    // Remove the columns
    await db.execute(`
      ALTER TABLE subscriptions 
      DROP COLUMN last_payment_date,
      DROP COLUMN next_payment_date,
      DROP COLUMN paystack_subscription_code,
      DROP COLUMN paystack_customer_code
    `);
    
    console.log('Successfully removed payment date columns from subscriptions table');
    
    return true;
  } catch (error) {
    console.error('Error removing payment date columns:', error);
    throw error;
  }
}
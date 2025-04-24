export async function up(db: any) {
  try {
    // Add email_token column to subscriptions table
    await db.query(`
      ALTER TABLE subscriptions
      ADD COLUMN email_token varchar(255) AFTER paystack_subscription_code
    `);
    
    console.log('Successfully added email_token column to subscriptions table');
    
    return { success: true };
  } catch (error) {
    console.error('Error adding email_token column to subscriptions table:', error);
    return { success: false, error };
  }
}

export async function down(db: any) {
  try {
    // Remove email_token column from subscriptions table
    await db.query(`
      ALTER TABLE subscriptions
      DROP COLUMN email_token
    `);
    
    console.log('Successfully removed email_token column from subscriptions table');
    
    return { success: true };
  } catch (error) {
    console.error('Error removing email_token column from subscriptions table:', error);
    return { success: false, error };
  }
}
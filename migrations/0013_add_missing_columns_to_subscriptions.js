/**
 * Migration to add missing columns to subscriptions table
 * 
 * This migration ensures the subscriptions table has all required fields
 * for Paystack integration, specifically adding the currency column
 * which might be missing in existing installations.
 */

export async function up(db) {
  console.log('Running migration to add missing columns to subscriptions table');

  try {
    // Check if subscriptions table exists
    const [subscriptionTables] = await db.query(`
      SHOW TABLES LIKE 'subscriptions'
    `);

    if (subscriptionTables.length > 0) {
      // Check if currency column exists
      try {
        const [currencyColumn] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'currency'`);
        
        if (currencyColumn.length === 0) {
          // Add currency column if it doesn't exist
          await db.query(`
            ALTER TABLE subscriptions 
            ADD COLUMN currency VARCHAR(10) DEFAULT 'ZAR' AFTER amount
          `);
          console.log('Added currency column to subscriptions table');
        } else {
          console.log('Currency column already exists in subscriptions table');
        }
      } catch (error) {
        console.error('Error checking/adding currency column:', error);
        throw error;
      }
      
      // Check if subscription_code column exists
      try {
        const [subscriptionCodeColumn] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'subscription_code'`);
        
        if (subscriptionCodeColumn.length === 0) {
          // Add subscription_code column if it doesn't exist
          await db.query(`
            ALTER TABLE subscriptions 
            ADD COLUMN subscription_code VARCHAR(255) NULL AFTER package_type
          `);
          console.log('Added subscription_code column to subscriptions table');
        } else {
          console.log('subscription_code column already exists in subscriptions table');
        }
      } catch (error) {
        console.error('Error checking/adding subscription_code column:', error);
        throw error;
      }
      
      // Check if customer_code column exists
      try {
        const [customerCodeColumn] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'customer_code'`);
        
        if (customerCodeColumn.length === 0) {
          // Add customer_code column if it doesn't exist
          await db.query(`
            ALTER TABLE subscriptions 
            ADD COLUMN customer_code VARCHAR(255) NULL AFTER subscription_code
          `);
          console.log('Added customer_code column to subscriptions table');
        } else {
          console.log('customer_code column already exists in subscriptions table');
        }
      } catch (error) {
        console.error('Error checking/adding customer_code column:', error);
        throw error;
      }
      
      // Check if email_token column exists
      try {
        const [emailTokenColumn] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'email_token'`);
        
        if (emailTokenColumn.length === 0) {
          // Add email_token column if it doesn't exist
          await db.query(`
            ALTER TABLE subscriptions 
            ADD COLUMN email_token VARCHAR(255) NULL AFTER customer_code
          `);
          console.log('Added email_token column to subscriptions table');
        } else {
          console.log('email_token column already exists in subscriptions table');
        }
      } catch (error) {
        console.error('Error checking/adding email_token column:', error);
        throw error;
      }
    } else {
      console.log('Subscriptions table does not exist, skipping migration');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Running down migration to remove added columns from subscriptions table');

  try {
    // Check if subscriptions table exists
    const [subscriptionTables] = await db.query(`
      SHOW TABLES LIKE 'subscriptions'
    `);

    if (subscriptionTables.length > 0) {
      // Check columns and remove added ones
      try {
        // Remove currency column if it exists
        const [currencyColumn] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'currency'`);
        if (currencyColumn.length > 0) {
          await db.query(`
            ALTER TABLE subscriptions 
            DROP COLUMN currency
          `);
          console.log('Removed currency column from subscriptions table');
        }
      } catch (error) {
        console.error('Error removing currency column:', error);
      }
    } else {
      console.log('Subscriptions table does not exist, skipping down migration');
    }

    console.log('Down migration completed successfully');
  } catch (error) {
    console.error('Error in down migration:', error);
    throw error;
  }
}
/**
 * Add cancelled_at column to subscriptions table
 * 
 * This migration adds a cancelled_at timestamp column to the subscriptions table 
 * to record when a subscription was cancelled.
 */

export async function up(db) {
  console.log('Running migration: Add cancelled_at column to subscriptions table');
  
  try {
    await db.query(`
      ALTER TABLE subscriptions
      ADD COLUMN cancelled_at TIMESTAMP NULL
    `);
    
    console.log('Successfully added cancelled_at column to subscriptions table');
    return { success: true };
  } catch (error) {
    console.error('Error adding cancelled_at column:', error);
    return { success: false, error };
  }
}

export async function down(db) {
  console.log('Running down migration: Remove cancelled_at column from subscriptions table');
  
  try {
    await db.query(`
      ALTER TABLE subscriptions
      DROP COLUMN cancelled_at
    `);
    
    console.log('Successfully removed cancelled_at column from subscriptions table');
    return { success: true };
  } catch (error) {
    console.error('Error removing cancelled_at column:', error);
    return { success: false, error };
  }
}
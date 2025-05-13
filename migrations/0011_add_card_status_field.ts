/**
 * Migration to add card_status field to users table
 * 
 * This migration adds a card_status field to track
 * physical card delivery status: NOT_DELIVERED, OUT_FOR_DELIVERY, DELIVERED
 */

export async function up(db: any) {
  await db.execute(`
    ALTER TABLE users
    ADD COLUMN card_status ENUM('NOT_DELIVERED', 'OUT_FOR_DELIVERY', 'DELIVERED') 
    DEFAULT 'NOT_DELIVERED'
    AFTER has_credit_card;
  `);
  
  console.log('Added card_status field to users table');
}

export async function down(db: any) {
  await db.execute(`
    ALTER TABLE users
    DROP COLUMN card_status;
  `);
  
  console.log('Removed card_status field from users table');
}
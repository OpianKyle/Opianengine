/**
 * Migration to add is_test field to users table
 * This allows us to identify test users and exclude them from statistics
 */
export async function up(db: any) {
  // Add is_test field to users table with default false
  await db.execute(`
    ALTER TABLE users
    ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // Update existing test users (using pattern matching on email domains)
  await db.execute(`
    UPDATE users
    SET is_test = TRUE
    WHERE email LIKE '%@testuser.com' OR email LIKE '%@testemail.com' OR email LIKE '%@example.com'
  `);

  console.log('✅ Added is_test field to users table');
}

export async function down(db: any) {
  await db.execute(`
    ALTER TABLE users
    DROP COLUMN is_test;
  `);
  
  console.log('⬇️ Removed is_test field from users table');
}
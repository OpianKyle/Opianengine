/**
 * Migration to add selectedPackage column to users table
 * 
 * This migration adds the selectedPackage column which stores the user's
 * currently selected subscription package type.
 */

export async function up(db) {
  console.log('Running migration to add selectedPackage column to users table');

  try {
    // Check if column already exists
    const [columns] = await db.query(`
      SHOW COLUMNS FROM users 
      LIKE 'selectedPackage'
    `);

    if (columns.length === 0) {
      // Add new column
      await db.query(`
        ALTER TABLE users
        ADD COLUMN selectedPackage VARCHAR(50) NULL
      `);
      console.log('Successfully added selectedPackage column to users table');
    } else {
      console.log('selectedPackage column already exists in users table');
    }
  } catch (error) {
    console.error('Error adding selectedPackage column:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Running migration to remove selectedPackage column from users table');

  try {
    // Check if column exists
    const [columns] = await db.query(`
      SHOW COLUMNS FROM users 
      LIKE 'selectedPackage'
    `);

    if (columns.length > 0) {
      // Remove column
      await db.query(`
        ALTER TABLE users
        DROP COLUMN selectedPackage
      `);
      console.log('Successfully removed selectedPackage column from users table');
    } else {
      console.log('selectedPackage column does not exist in users table');
    }
  } catch (error) {
    console.error('Error removing selectedPackage column:', error);
    throw error;
  }
}
/**
 * Migration to add selectedPackage column to users table
 * 
 * This migration adds the selectedPackage column which stores the user's
 * currently selected subscription package type.
 */

export async function up(db) {
  try {
    console.log('Running migration to add selectedPackage column...');

    // Check if the column already exists before trying to add it
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'selectedPackage'
    `);

    if (columns.length === 0) {
      // Add selectedPackage field if it doesn't exist
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN selectedPackage ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') DEFAULT NULL
      `);
      console.log('Added selectedPackage column to users table.');
    } else {
      console.log('selectedPackage column already exists in users table. Skipping.');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error in migration:', error);
    return Promise.reject(error);
  }
}

export async function down(db) {
  try {
    console.log('Reverting migration to remove selectedPackage column...');
    
    // Check if the column exists before trying to drop it
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'selectedPackage'
    `);

    if (columns.length > 0) {
      await db.query(`
        ALTER TABLE users 
        DROP COLUMN selectedPackage
      `);
      console.log('Removed selectedPackage column from users table.');
    } else {
      console.log('selectedPackage column does not exist in users table. Skipping.');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error in migration:', error);
    return Promise.reject(error);
  }
}
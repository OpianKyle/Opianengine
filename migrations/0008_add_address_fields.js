export async function up(db) {
  console.log('Adding suburb and province fields to users table');
  
  try {
    // Check if suburb column already exists
    const [suburbCheck] = await db.execute('SHOW COLUMNS FROM users LIKE "suburb"');
    if (suburbCheck.length === 0) {
      console.log('Adding suburb column');
      await db.execute('ALTER TABLE users ADD COLUMN suburb VARCHAR(255) DEFAULT ""');
    } else {
      console.log('suburb column already exists');
    }
    
    // Check if province column already exists
    const [provinceCheck] = await db.execute('SHOW COLUMNS FROM users LIKE "province"');
    if (provinceCheck.length === 0) {
      console.log('Adding province column');
      await db.execute('ALTER TABLE users ADD COLUMN province VARCHAR(255) DEFAULT ""');
    } else {
      console.log('province column already exists');
    }
    
    // Check if city column already exists
    const [cityCheck] = await db.execute('SHOW COLUMNS FROM users LIKE "city"');
    if (cityCheck.length === 0) {
      console.log('Adding city column');
      await db.execute('ALTER TABLE users ADD COLUMN city VARCHAR(255) DEFAULT ""');
    } else {
      console.log('city column already exists');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Reverting address fields migration');
  
  try {
    await db.execute('ALTER TABLE users DROP COLUMN IF EXISTS suburb');
    await db.execute('ALTER TABLE users DROP COLUMN IF EXISTS province');
    await db.execute('ALTER TABLE users DROP COLUMN IF EXISTS city');
    
    console.log('Migration reverted successfully');
  } catch (error) {
    console.error('Error reverting migration:', error);
    throw error;
  }
}
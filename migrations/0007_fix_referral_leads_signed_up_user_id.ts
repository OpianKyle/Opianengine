export async function up(db: any) {
  console.log('Running migration: 0007_fix_referral_leads_signed_up_user_id (up)');

  // Check if the signed_up_user_id column exists in the referral_leads table
  const [columnCheck] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'referral_leads' 
    AND column_name = 'signed_up_user_id'
  `);
  
  if (columnCheck[0].count === 0) {
    console.log('signed_up_user_id column does not exist in referral_leads table, adding it now');
    
    // Add the signed_up_user_id column
    await db.execute(`
      ALTER TABLE referral_leads 
      ADD COLUMN signed_up_user_id INT,
      ADD CONSTRAINT fk_referral_leads_signed_up_user
      FOREIGN KEY (signed_up_user_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL
    `);
    
    console.log('Added signed_up_user_id column to referral_leads table');
  } else {
    console.log('signed_up_user_id column already exists in referral_leads table, skipping addition');
  }

  console.log('Migration 0007_fix_referral_leads_signed_up_user_id completed successfully (up)');
}

export async function down(db: any) {
  console.log('Running migration: 0007_fix_referral_leads_signed_up_user_id (down)');

  // Check if the signed_up_user_id column exists
  const [columnCheck] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'referral_leads' 
    AND column_name = 'signed_up_user_id'
  `);

  if (columnCheck[0].count > 0) {
    // First drop the foreign key constraint
    // MariaDB doesn't support dropping constraint directly by name, so we need to find it
    const [constraints] = await db.execute(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'referral_leads' 
      AND COLUMN_NAME = 'signed_up_user_id' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    if (Array.isArray(constraints) && constraints.length > 0) {
      const constraintName = constraints[0].CONSTRAINT_NAME;
      
      await db.execute(`
        ALTER TABLE referral_leads 
        DROP FOREIGN KEY ${constraintName}
      `);
      
      console.log(`Dropped foreign key constraint ${constraintName} from referral_leads table`);
    }
    
    // Now drop the column
    await db.execute(`
      ALTER TABLE referral_leads 
      DROP COLUMN signed_up_user_id
    `);
    
    console.log('Dropped signed_up_user_id column from referral_leads table');
  } else {
    console.log('signed_up_user_id column does not exist in referral_leads table, nothing to drop');
  }

  console.log('Migration 0007_fix_referral_leads_signed_up_user_id rolled back successfully (down)');
}
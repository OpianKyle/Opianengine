export async function up(db: any) {
  console.log('Running migration: 0006_update_agent_commission_package_types (up)');

  // Check if agent_commissions table exists
  const [tableCheck] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'agent_commissions'
  `);

  if (tableCheck[0].count === 0) {
    console.log('agent_commissions table does not exist, skipping migration');
    return;
  }

  // Check the current package_type enum
  const [enumCheck] = await db.execute(`
    SELECT COLUMN_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'agent_commissions' 
    AND COLUMN_NAME = 'package_type'
  `);
  
  const packageTypeEnum = enumCheck[0].COLUMN_TYPE;
  console.log('Current package_type enum:', packageTypeEnum);
  
  // Check if the enum already includes all the new package types
  if (packageTypeEnum.includes('OPPORTUNITY') && 
      packageTypeEnum.includes('MOMENTUM') && 
      packageTypeEnum.includes('PROSPER') &&
      packageTypeEnum.includes('PRESTIGE') &&
      packageTypeEnum.includes('PINNACLE')) {
    
    console.log('package_type enum already has all required values');
    
    // Ensure these are the only values available by recreating the enum
    try {
      // First convert any old values to new ones
      await db.execute(`
        UPDATE agent_commissions 
        SET package_type = 'OPPORTUNITY'
        WHERE package_type IN ('BASIC', 'STANDARD') 
        AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')
      `);
      
      await db.execute(`
        UPDATE agent_commissions 
        SET package_type = 'PROSPER'
        WHERE package_type = 'PREMIUM' 
        AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')
      `);
      
      await db.execute(`
        UPDATE agent_commissions 
        SET package_type = 'PRESTIGE'
        WHERE package_type = 'ELITE' 
        AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')
      `);
      
      await db.execute(`
        UPDATE agent_commissions 
        SET package_type = 'PINNACLE'
        WHERE package_type = 'EXECUTIVE' 
        AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')
      `);
      
      // Then modify the column to use only the new enum values
      await db.execute(`
        ALTER TABLE agent_commissions 
        MODIFY COLUMN package_type ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL
      `);
      
      console.log('Successfully restricted package_type enum to the required values only');
    } catch (error) {
      console.error('Error updating package_type values:', error);
      throw error;
    }
    
    return;
  }
  
  // If we get here, we need to update the enum
  console.log('Updating package_type enum in agent_commissions table');
  
  try {
    // First, add the new values to the enum if they don't exist yet
    if (!packageTypeEnum.includes('OPPORTUNITY') || 
        !packageTypeEnum.includes('MOMENTUM') || 
        !packageTypeEnum.includes('PROSPER') ||
        !packageTypeEnum.includes('PRESTIGE') ||
        !packageTypeEnum.includes('PINNACLE')) {
      
      await db.execute(`
        ALTER TABLE agent_commissions 
        MODIFY COLUMN package_type ENUM('BASIC', 'STANDARD', 'PREMIUM', 'PLATINUM', 'EXECUTIVE', 
                                      'OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL
      `);
      
      console.log('Added new package types to the enum');
    }
    
    // Convert old values to new ones
    await db.execute(`
      UPDATE agent_commissions 
      SET package_type = 'OPPORTUNITY'
      WHERE package_type IN ('BASIC', 'STANDARD') 
    `);
    
    await db.execute(`
      UPDATE agent_commissions 
      SET package_type = 'PROSPER'
      WHERE package_type = 'PREMIUM' 
    `);
    
    await db.execute(`
      UPDATE agent_commissions 
      SET package_type = 'PRESTIGE'
      WHERE package_type = 'ELITE' 
    `);
    
    await db.execute(`
      UPDATE agent_commissions 
      SET package_type = 'PINNACLE'
      WHERE package_type = 'EXECUTIVE' 
    `);
    
    console.log('Updated existing records to use new package types');
    
    // Finally, modify the column to use only the new enum values
    await db.execute(`
      ALTER TABLE agent_commissions 
      MODIFY COLUMN package_type ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL
    `);
    
    console.log('Successfully updated package_type enum to use only the required values');
  } catch (error) {
    console.error('Error updating package_type enum:', error);
    throw error;
  }

  console.log('Migration 0006_update_agent_commission_package_types completed successfully (up)');
}

export async function down(db: any) {
  console.log('Running migration: 0006_update_agent_commission_package_types (down)');
  
  // Note: We won't completely revert the changes as it might cause data loss
  // Instead, we'll just add back the old enum values for compatibility
  
  try {
    await db.execute(`
      ALTER TABLE agent_commissions 
      MODIFY COLUMN package_type ENUM('BASIC', 'STANDARD', 'PREMIUM', 'PLATINUM', 'EXECUTIVE', 
                                    'OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL
    `);
    
    console.log('Added back old package type enum values for compatibility');
  } catch (error) {
    console.error('Error reverting package_type enum:', error);
    throw error;
  }
  
  console.log('Migration 0006_update_agent_commission_package_types rolled back (down)');
}
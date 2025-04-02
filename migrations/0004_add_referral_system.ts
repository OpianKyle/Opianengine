export async function up(db: any) {
  console.log('Running migration: 0004_add_referral_system (up)');

  // Check if tables already exist
  const [tableCheckReferrals] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'referral_leads'
  `);
  
  const [tableCheckCommissions] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'agent_commissions'
  `);

  // Create referral_leads table if it doesn't exist
  if (tableCheckReferrals[0].count === 0) {
    await db.execute(`
      CREATE TABLE referral_leads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        referral_code TEXT NOT NULL,
        notes TEXT,
        status ENUM('NEW', 'CONTACTED', 'SIGNED_UP', 'NOT_INTERESTED') DEFAULT 'NEW' NOT NULL,
        signed_up_user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (signed_up_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Created referral_leads table');
  } else {
    console.log('referral_leads table already exists, skipping creation');
  }

  // Create agent_commissions table if it doesn't exist
  if (tableCheckCommissions[0].count === 0) {
    await db.execute(`
      CREATE TABLE agent_commissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id INT NOT NULL,
        customer_id INT NOT NULL,
        commission_type ENUM('SIGNUP', 'RENEWAL') NOT NULL,
        package_type ENUM('BASIC', 'STANDARD', 'PREMIUM', 'PLATINUM', 'EXECUTIVE') NOT NULL,
        premium_amount INT NOT NULL,
        commission_percentage INT NOT NULL,
        commission_amount INT NOT NULL,
        status ENUM('PENDING', 'PAID') DEFAULT 'PENDING' NOT NULL,
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Created agent_commissions table');
  } else {
    console.log('agent_commissions table already exists, skipping creation');
  }

  // Check if we need to add a referral_code column to the users table
  const [columnsCheck] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND column_name = 'referral_code'
  `);

  if (columnsCheck[0].count === 0) {
    await db.execute(`
      ALTER TABLE users 
      ADD COLUMN referral_code VARCHAR(10) NULL UNIQUE
    `);
    console.log('Added referral_code column to users table');
  } else {
    console.log('referral_code column already exists in users table, skipping addition');
  }

  // Make sure AGENT_CREATED and AGENT_REMOVED are valid action_types in admin_logs
  // First check if we need to update the enum
  const [enumCheck] = await db.execute(`
    SELECT COLUMN_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'admin_logs' 
    AND COLUMN_NAME = 'action_type'
  `);

  const actionTypeEnum = enumCheck[0].COLUMN_TYPE;
  if (!actionTypeEnum.includes('AGENT_CREATED') || 
      !actionTypeEnum.includes('AGENT_REMOVED') ||
      !actionTypeEnum.includes('REFERRAL_PROCESSED') ||
      !actionTypeEnum.includes('COMMISSION_PAID')) {
    // Need to update the enum to add these values
    // Extract the current values from the enum
    const enumValues = actionTypeEnum
      .replace(/^enum\('/, '')
      .replace(/'\)$/, '')
      .split("','");
    
    // Add new values if they don't exist
    if (!enumValues.includes('AGENT_CREATED')) enumValues.push('AGENT_CREATED');
    if (!enumValues.includes('AGENT_REMOVED')) enumValues.push('AGENT_REMOVED');
    if (!enumValues.includes('AGENT_ENABLED')) enumValues.push('AGENT_ENABLED');
    if (!enumValues.includes('AGENT_DISABLED')) enumValues.push('AGENT_DISABLED');
    if (!enumValues.includes('REFERRAL_PROCESSED')) enumValues.push('REFERRAL_PROCESSED');
    if (!enumValues.includes('COMMISSION_PAID')) enumValues.push('COMMISSION_PAID');
    
    // Construct the new enum string
    const newEnumString = `'${enumValues.join("','")}'`;
    
    // Alter the table to update the enum
    await db.execute(`
      ALTER TABLE admin_logs 
      MODIFY COLUMN action_type ENUM(${newEnumString}) NOT NULL
    `);
    console.log('Updated action_type enum in admin_logs table');
  } else {
    console.log('action_type enum already has required values, skipping update');
  }

  console.log('Migration 0004_add_referral_system completed successfully (up)');
}

export async function down(db: any) {
  console.log('Running migration: 0004_add_referral_system (down)');

  // Drop tables in reverse order due to foreign key constraints
  await db.execute('DROP TABLE IF EXISTS agent_commissions');
  console.log('Dropped agent_commissions table');
  
  await db.execute('DROP TABLE IF EXISTS referral_leads');
  console.log('Dropped referral_leads table');

  // We could remove the referral_code column from users, but we'll leave it to avoid data loss
  
  console.log('Migration 0004_add_referral_system rolled back successfully (down)');
}
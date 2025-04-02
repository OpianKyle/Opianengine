export async function up(db: any) {
  console.log('Running migration: 0005_update_commission_package_types (up)');

  // Check if agent_commissions table exists
  const [tableCheck] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'agent_commissions'
  `);

  if (tableCheck[0].count === 0) {
    console.log('agent_commissions table does not exist, creating it');
    
    // Create agent_commissions table with new package types
    await db.execute(`
      CREATE TABLE agent_commissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id INT NOT NULL,
        customer_id INT NOT NULL,
        commission_type ENUM('SIGNUP', 'RENEWAL') NOT NULL,
        package_type ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL,
        premium_amount DECIMAL(10,2) NOT NULL,
        commission_percentage DECIMAL(5,2) NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        status ENUM('PENDING', 'PAID') DEFAULT 'PENDING' NOT NULL,
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } else {
    console.log('agent_commissions table exists, checking package_type enum');
    
    // Check the current package_type enum
    const [enumCheck] = await db.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_commissions' 
      AND COLUMN_NAME = 'package_type'
    `);
    
    const packageTypeEnum = enumCheck[0].COLUMN_TYPE;
    
    // Check if the enum already includes the new package types
    if (!packageTypeEnum.includes('OPPORTUNITY') || 
        !packageTypeEnum.includes('MOMENTUM') || 
        !packageTypeEnum.includes('PROSPER') ||
        !packageTypeEnum.includes('PRESTIGE') ||
        !packageTypeEnum.includes('PINNACLE')) {
      
      console.log('Updating package_type enum in agent_commissions table');
      
      // Alter the table to update the enum
      await db.execute(`
        ALTER TABLE agent_commissions 
        MODIFY COLUMN package_type ENUM('BASIC', 'STANDARD', 'PREMIUM', 'PLATINUM', 'EXECUTIVE', 
                                       'OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL
      `);
    } else {
      console.log('package_type enum already has required values, skipping update');
    }
  }

  // Update transaction_type enum in transactions table if needed
  const [transactionEnumCheck] = await db.execute(`
    SELECT COLUMN_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'transactions' 
    AND COLUMN_NAME = 'type'
  `);

  if (transactionEnumCheck && transactionEnumCheck.length > 0) {
    const transactionTypeEnum = transactionEnumCheck[0].COLUMN_TYPE;
    
    if (!transactionTypeEnum.includes('COMMISSION')) {
      console.log('Adding COMMISSION to transaction type enum');
      
      // Extract the current values from the enum
      const enumValues = transactionTypeEnum
        .replace(/^enum\('/, '')
        .replace(/'\)$/, '')
        .split("','");
      
      // Add the new value
      enumValues.push('COMMISSION');
      
      // Construct the new enum string
      const newEnumString = `'${enumValues.join("','")}'`;
      
      // Alter the table
      await db.execute(`
        ALTER TABLE transactions 
        MODIFY COLUMN type ENUM(${newEnumString}) NOT NULL
      `);
    }
  }

  // Add agent_id column to users table if it doesn't exist
  const [agentIdCheck] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND column_name = 'agent_id'
  `);

  if (agentIdCheck[0].count === 0) {
    console.log('Adding agent_id column to users table');
    
    await db.execute(`
      ALTER TABLE users 
      ADD COLUMN agent_id INT NULL,
      ADD FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  // Now populate the agent_commissions table with existing agent-customer relationships
  console.log('Migrating existing agent-customer relationships to agent_commissions table');
  
  // First get all customers with agent_id set
  const [customers] = await db.execute(`
    SELECT 
      u.id as customer_id, 
      u.agent_id, 
      u.selected_package,
      u.created_at,
      pp.premium_amount
    FROM users u
    LEFT JOIN package_premium_amounts pp ON pp.package_type = u.selected_package
    WHERE u.agent_id IS NOT NULL
  `);

  if (customers && customers.length > 0) {
    console.log(`Found ${customers.length} customers with agent_id set`);
    
    // Insert each customer into agent_commissions if not already there
    for (const customer of customers) {
      // Check if this relationship already exists in agent_commissions
      const [existingCommission] = await db.execute(`
        SELECT id FROM agent_commissions 
        WHERE agent_id = ? AND customer_id = ?
      `, [customer.agent_id, customer.customer_id]);
      
      if (!existingCommission || existingCommission.length === 0) {
        // Calculate commission (7.5% for sign-up)
        const commissionPercentage = 7.5; // 7.5%
        const premiumAmount = customer.premium_amount || 0;
        const commissionAmount = (premiumAmount * commissionPercentage / 100).toFixed(2);
        
        // Insert into agent_commissions
        await db.execute(`
          INSERT INTO agent_commissions (
            agent_id, 
            customer_id, 
            commission_type, 
            package_type, 
            premium_amount, 
            commission_percentage, 
            commission_amount,
            status,
            created_at
          ) VALUES (?, ?, 'SIGNUP', ?, ?, ?, ?, 'PENDING', ?)
        `, [
          customer.agent_id,
          customer.customer_id,
          customer.selected_package || 'OPPORTUNITY',
          premiumAmount || 350,
          commissionPercentage,
          commissionAmount,
          customer.created_at
        ]);
        
        console.log(`Added commission for customer ${customer.customer_id} with agent ${customer.agent_id}`);
      } else {
        console.log(`Commission already exists for customer ${customer.customer_id} with agent ${customer.agent_id}`);
      }
    }
  } else {
    console.log('No customers found with agent_id set');
  }

  // Next handle customers with referred_by set to referral_code
  const [agentsWithReferrals] = await db.execute(`
    SELECT id, referral_code FROM users WHERE is_agent = 1 AND referral_code IS NOT NULL
  `);

  if (agentsWithReferrals && agentsWithReferrals.length > 0) {
    console.log(`Found ${agentsWithReferrals.length} agents with referral codes`);
    
    for (const agent of agentsWithReferrals) {
      // Get customers referred by this agent
      const [referredCustomers] = await db.execute(`
        SELECT 
          u.id as customer_id, 
          u.selected_package,
          u.created_at,
          pp.premium_amount
        FROM users u
        LEFT JOIN package_premium_amounts pp ON pp.package_type = u.selected_package
        WHERE u.referred_by = ?
      `, [agent.referral_code]);
      
      if (referredCustomers && referredCustomers.length > 0) {
        console.log(`Found ${referredCustomers.length} customers referred by agent ${agent.id}`);
        
        // For each referred customer
        for (const customer of referredCustomers) {
          // Check if this relationship already exists in agent_commissions
          const [existingCommission] = await db.execute(`
            SELECT id FROM agent_commissions 
            WHERE agent_id = ? AND customer_id = ?
          `, [agent.id, customer.customer_id]);
          
          if (!existingCommission || existingCommission.length === 0) {
            // Also update the agent_id in the users table if not set
            await db.execute(`
              UPDATE users SET agent_id = ? WHERE id = ? AND (agent_id IS NULL OR agent_id = 0)
            `, [agent.id, customer.customer_id]);
            
            // Calculate commission (7.5% for sign-up)
            const commissionPercentage = 7.5; // 7.5%
            const premiumAmount = customer.premium_amount || 0;
            const commissionAmount = (premiumAmount * commissionPercentage / 100).toFixed(2);
            
            // Insert into agent_commissions
            await db.execute(`
              INSERT INTO agent_commissions (
                agent_id, 
                customer_id, 
                commission_type, 
                package_type, 
                premium_amount, 
                commission_percentage, 
                commission_amount,
                status,
                created_at
              ) VALUES (?, ?, 'SIGNUP', ?, ?, ?, ?, 'PENDING', ?)
            `, [
              agent.id,
              customer.customer_id,
              customer.selected_package || 'OPPORTUNITY',
              premiumAmount || 350,
              commissionPercentage,
              commissionAmount,
              customer.created_at
            ]);
            
            console.log(`Added commission for referred customer ${customer.customer_id} with agent ${agent.id}`);
          } else {
            console.log(`Commission already exists for referred customer ${customer.customer_id} with agent ${agent.id}`);
          }
        }
      } else {
        console.log(`No customers found referred by agent ${agent.id}`);
      }
    }
  } else {
    console.log('No agents found with referral codes');
  }

  console.log('Migration 0005_update_commission_package_types completed successfully (up)');
}

export async function down(db: any) {
  console.log('Running migration: 0005_update_commission_package_types (down)');
  
  // We won't drop the agent_commissions table or remove data,
  // but we can restore the original enum values if needed
  
  // Check if the agent_commissions table exists
  const [tableCheck] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'agent_commissions'
  `);
  
  if (tableCheck[0].count > 0) {
    console.log('Reverting package_type enum changes in agent_commissions table');
    
    // Revert the enum changes
    try {
      await db.execute(`
        ALTER TABLE agent_commissions 
        MODIFY COLUMN package_type ENUM('BASIC', 'STANDARD', 'PREMIUM', 'PLATINUM', 'EXECUTIVE') NOT NULL
      `);
    } catch (error) {
      console.error('Error reverting package_type enum: ', error);
      console.log('This is likely because there are entries with the new package types');
    }
  }
  
  console.log('Migration 0005_update_commission_package_types rolled back successfully (down)');
}
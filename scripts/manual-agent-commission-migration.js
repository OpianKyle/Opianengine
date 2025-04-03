/**
 * Manual Agent Commission Migration Script
 * 
 * This script directly executes SQL to migrate users with agent_id to the agent_commissions table.
 * It's designed as an alternative to the more complex migration process when timeout issues occur.
 * 
 * The script:
 * 1. Finds all users who were signed up by an agent (have agent_id field populated)
 * 2. Checks if these users are already in the agent_commissions table
 * 3. Adds missing users to the agent_commissions table with calculated commission values
 * 4. Returns detailed results of the migration process
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Package prices for commission calculation
const PACKAGE_PRICES = {
  'OPPORTUNITY': 350,
  'MOMENTUM': 450,
  'PROSPER': 550,
  'PRESTIGE': 695,
  'PINNACLE': 825
};

// Commission rates
const COMMISSION_RATE_FIRST_TIME = 0.3; // 30% for first sign-up

// Main migration function
async function migrateAgentCustomers() {
  let connection;
  let results = {
    usersFound: 0,
    usersMigrated: 0,
    usersSkipped: 0,
    errors: 0,
    output: ''
  };
  
  try {
    console.log('Starting manual agent commission migration...');
    
    // Create database connection - using MariaDB environment variables
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
      user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'opian',
      port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
      connectTimeout: 60000, // 60 second timeout
    });
    
    console.log('Database connection established');
    results.output += 'Database connection established\n';
    
    // Find all users with agent_id that are not in agent_commissions table
    const [users] = await connection.execute(`
      SELECT u.id, u.agent_id, u.selected_package, u.created_at 
      FROM users u
      WHERE u.agent_id IS NOT NULL
      AND u.agent_id > 0
      AND NOT EXISTS (
        SELECT 1 FROM agent_commissions ac 
        WHERE ac.customer_id = u.id
      )
    `);
    
    results.usersFound = users.length;
    console.log(`Found ${users.length} users to migrate`);
    results.output += `Found ${users.length} users to migrate\n`;
    
    // Process each user
    for (const user of users) {
      try {
        // Calculate commission amount based on package
        const packageType = user.selected_package;
        const packagePrice = PACKAGE_PRICES[packageType] || 0;
        
        if (!packagePrice) {
          console.log(`Skipping user ${user.id}, unknown package type: ${packageType}`);
          results.output += `Skipping user ${user.id}, unknown package type: ${packageType}\n`;
          results.usersSkipped++;
          continue;
        }
        
        const commissionAmount = packagePrice * COMMISSION_RATE_FIRST_TIME;
        
        // Insert record in agent_commissions table
        await connection.execute(`
          INSERT INTO agent_commissions (
            agent_id, customer_id, commission_type, package_type,
            premium_amount, commission_percentage, commission_amount,
            status, created_at
          ) VALUES (
            ?, ?, 'SIGNUP', ?, ?, ?, ?, 'PENDING', NOW()
          )
        `, [
          user.agent_id, 
          user.id, 
          packageType,
          packagePrice,
          COMMISSION_RATE_FIRST_TIME * 100, // Convert to percentage (0.3 -> 30)
          commissionAmount
        ]);
        
        console.log(`Migrated user ${user.id} with package ${packageType}, commission: R${commissionAmount}, percentage: ${COMMISSION_RATE_FIRST_TIME * 100}%`);
        results.output += `Migrated user ${user.id} with package ${packageType}, commission: R${commissionAmount}, percentage: ${COMMISSION_RATE_FIRST_TIME * 100}%\n`;
        results.usersMigrated++;
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error.message);
        results.output += `Error processing user ${user.id}: ${error.message}\n`;
        results.errors++;
      }
    }
    
    console.log('Migration complete');
    results.output += 'Migration complete\n';
    console.log(`Results: Found: ${results.usersFound}, Migrated: ${results.usersMigrated}, Skipped: ${results.usersSkipped}, Errors: ${results.errors}`);
    results.output += `Results: Found: ${results.usersFound}, Migrated: ${results.usersMigrated}, Skipped: ${results.usersSkipped}, Errors: ${results.errors}\n`;
    
    // Output the final result as JSON so it can be parsed by the API
    console.log(JSON.stringify(results));
    
    return results;
  } catch (error) {
    console.error('Migration failed:', error.message);
    results.output += `Migration failed: ${error.message}\n`;
    results.errors++;
    
    // Output the error result as JSON so it can be parsed by the API
    console.log(JSON.stringify({
      usersFound: results.usersFound,
      usersMigrated: results.usersMigrated,
      usersSkipped: results.usersSkipped,
      errors: results.errors,
      output: results.output
    }));
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Execute the migration if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAgentCustomers()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed with error:', error.message);
      process.exit(1);
    });
}

// Export for use as a module
export { migrateAgentCustomers };
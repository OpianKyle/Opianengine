/**
 * Monthly Renewal Processing Script
 * 
 * This script processes all SIGNUP commission records and creates corresponding
 * RENEWAL commission records on the first of each month. It should be run via a
 * scheduler (e.g., cron job) on the first day of each month.
 * 
 * For each customer signed up by an agent, it creates a new RENEWAL commission
 * record with the same commission percentage (30%).
 */

// Use CommonJS require for compatibility with both ESM and CommonJS
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

// Package pricing structure
const PACKAGE_PRICING = {
  'OPPORTUNITY': 350, // R350
  'MOMENTUM': 450,    // R450
  'PROSPER': 550,     // R550
  'PRESTIGE': 695,    // R695
  'PINNACLE': 825     // R825
};

// Commission percentages
const COMMISSION_PERCENTAGE = {
  AGENT: 10, // 10% for renewal commissions (reduced from the 30% for initial sign-ups)
};

// Main function to process renewals
async function processMonthlyRenewals() {
  let connection;
  const results = {
    success: true,
    processedDate: new Date().toISOString(),
    customersProcessed: 0,
    renewalsCreated: 0,
    errors: []
  };
  
  try {
    console.log('Starting monthly renewal processing...');
    
    // Only run on the first day of the month (unless overridden for testing)
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;
    const override = process.argv.includes('--force');
    
    if (!isFirstOfMonth && !override) {
      console.log('Not the first day of the month. Exiting. (Use --force to override)');
      return {
        ...results,
        success: false,
        message: 'Not the first day of the month. Script will only run on day 1.'
      };
    }
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
      user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'opian',
      port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
      connectTimeout: 60000, // 60 second timeout
    });
    
    console.log('Database connection established');
    
    // First check if agent_commissions table exists
    const [tableCheck] = await connection.execute(`
      SELECT COUNT(*) as table_exists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'agent_commissions'
    `);
    
    if (!tableCheck[0].table_exists) {
      console.log('agent_commissions table does not exist, nothing to process');
      return { 
        ...results, 
        success: false,
        message: 'Commission table does not exist' 
      };
    }
    
    // Get the current month and year
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = today.getFullYear();
    
    // Check if we already processed renewals for this month
    const [existingRenewals] = await connection.execute(`
      SELECT COUNT(*) as count FROM agent_commissions 
      WHERE commission_type = 'RENEWAL' 
      AND MONTH(created_at) = ? 
      AND YEAR(created_at) = ?
    `, [currentMonth, currentYear]);
    
    if (existingRenewals[0].count > 0 && !override) {
      console.log(`Already processed ${existingRenewals[0].count} renewals for ${currentMonth}/${currentYear}`);
      return {
        ...results,
        success: false,
        message: `Renewals already processed for ${currentMonth}/${currentYear}. Use --force to override.`
      };
    }
    
    // Start a transaction for the entire renewal process
    await connection.beginTransaction();
    
    // Get all customers with agent_id who have active subscriptions
    const [customers] = await connection.execute(`
      SELECT 
        u.id as customer_id,
        u.agent_id,
        u.selected_package,
        u.email,
        u.is_enabled
      FROM users u
      WHERE u.agent_id IS NOT NULL
      AND u.is_enabled = 1
    `);
    
    console.log(`Found ${customers.length} active customers with agents`);
    results.customersProcessed = customers.length;
    
    // Process each customer
    for (const customer of customers) {
      try {
        // Get the package price
        const packagePrice = PACKAGE_PRICING[customer.selected_package] || 350;
        
        // Calculate commission (10% for renewals instead of 30% for signup)
        const commissionPercentage = COMMISSION_PERCENTAGE.AGENT;
        const commissionAmount = (packagePrice * commissionPercentage / 100).toFixed(2);
        
        // Insert the RENEWAL commission record
        const [result] = await connection.execute(`
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
          ) VALUES (?, ?, 'RENEWAL', ?, ?, ?, ?, 'PENDING', NOW())
        `, [
          customer.agent_id,
          customer.customer_id,
          customer.selected_package,
          packagePrice,
          commissionPercentage,
          commissionAmount
        ]);
        
        console.log(`Created RENEWAL commission for customer ${customer.customer_id} (${customer.email})`);
        results.renewalsCreated++;
      } catch (error) {
        console.error(`Error processing customer ${customer.customer_id}:`, error);
        results.errors.push({
          customerId: customer.customer_id,
          error: error.message
        });
      }
    }
    
    // Commit the transaction
    await connection.commit();
    console.log(`Successfully created ${results.renewalsCreated} renewal commissions`);
    
  } catch (error) {
    console.error('Error during renewal processing:', error);
    
    // Rollback transaction on error
    if (connection) {
      try {
        await connection.rollback();
        console.log('Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    results.success = false;
    results.errors.push({
      general: true,
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
  
  return results;
}

// Run the function if this script is executed directly
if (require.main === module) {
  (async () => {
    try {
      const results = await processMonthlyRenewals();
      console.log('Monthly renewal processing results:', JSON.stringify(results, null, 2));
      
      // Exit with appropriate code
      process.exit(results.success ? 0 : 1);
    } catch (error) {
      console.error('Fatal error running renewal processing:', error);
      process.exit(1);
    }
  })();
}

// Export for use in other scripts/tests
module.exports = { processMonthlyRenewals };
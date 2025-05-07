/**
 * Convert All Signup Commissions to Renewal Script
 * 
 * This is a one-time script that converts ALL SIGNUP commission records in the database
 * to RENEWAL type with the appropriate 10% commission rate (instead of 30%).
 * 
 * This script should ONLY be run when you need to convert all historical records at once.
 * For regular monthly processing, use convert-signups-to-renewals.js instead.
 * 
 * The script:
 * 1. Finds all SIGNUP commission records (regardless of when they were created)
 * 2. Updates their commission_type to RENEWAL
 * 3. Recalculates the commission_percentage to 10%
 * 4. Recalculates the commission_amount based on the premium_amount
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
  SIGNUP: 30, // 30% for initial sign-ups
  RENEWAL: 10 // 10% for renewals
};

/**
 * Main function to convert all signup commissions to renewal
 */
async function convertAllSignupsToRenewal() {
  let connection;
  const results = {
    success: true,
    recordsFound: 0,
    recordsConverted: 0,
    errors: []
  };

  try {
    console.log('Starting conversion of ALL SIGNUP commissions to RENEWAL type');

    // Connect to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Successfully connected to database');

    // Get all SIGNUP commission records (no date filtering), handling different case variations
    const [commissions] = await connection.execute(`
      SELECT 
        id, 
        agent_id, 
        customer_id, 
        package_type, 
        premium_amount, 
        commission_percentage,
        commission_amount,
        commission_type,
        created_at
      FROM agent_commissions
      WHERE (commission_type = 'SIGNUP' OR commission_type = 'signup' OR commission_type = 'SignUp')
    `);
    
    console.log(`Found ${commissions.length} SIGNUP commission records in total`);
    results.recordsFound = commissions.length;
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      // Update each commission record
      for (const commission of commissions) {
        // Get the premium amount - use the stored value or fallback to package price
        const premiumAmount = parseFloat(commission.premium_amount) || 
          PACKAGE_PRICING[commission.package_type] || 350;
        
        // Calculate new commission amount based on 10% (RENEWAL rate)
        const newCommissionAmount = (premiumAmount * COMMISSION_PERCENTAGE.RENEWAL / 100).toFixed(2);
        
        // Update the record
        await connection.execute(`
          UPDATE agent_commissions
          SET 
            commission_type = 'RENEWAL',
            commission_percentage = ?,
            commission_amount = ?
          WHERE id = ?
        `, [
          COMMISSION_PERCENTAGE.RENEWAL,
          newCommissionAmount,
          commission.id
        ]);
        
        console.log(`Converted commission ID ${commission.id} from SIGNUP to RENEWAL: Commission changed from R${commission.commission_amount} to R${newCommissionAmount}`);
        results.recordsConverted++;
      }
      
      // Commit the transaction
      await connection.commit();
      console.log(`Successfully converted ${results.recordsConverted} of ${results.recordsFound} commissions`);
      
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      console.error('Error during transaction, changes rolled back:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('Error during conversion process:', error);
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

// Run the script if called directly (not imported)
if (require.main === module) {
  convertAllSignupsToRenewal()
    .then(results => {
      console.log('Conversion results:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { convertAllSignupsToRenewal };
/**
 * Update Commission Percentage Script
 * 
 * This script updates all existing commission records in the agent_commissions table
 * to use the correct 30% commission rate for SIGNUP type commissions (instead of 7.5%)
 * and recalculates the commission_amount values accordingly.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
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
const COMMISSION_PERCENTAGES = {
  'SIGNUP': 30,       // 30% for first-time sign-ups
  'RENEWAL': 10       // 10% for renewals
};

// Main migration function
async function updateCommissionPercentages() {
  let connection;
  const results = {
    recordsFound: 0,
    recordsUpdated: 0,
    errors: []
  };
  
  try {
    console.log('Starting commission percentage update...');
    
    // Create database connection - using environment variables
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
      user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'opian',
      port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
      connectTimeout: 60000, // 60 second timeout
    });
    
    console.log('Database connection established');
    
    // First check if table exists
    const [tableCheck] = await connection.execute(`
      SELECT COUNT(*) as table_exists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'agent_commissions'
    `);
    
    if (!tableCheck[0].table_exists) {
      console.log('agent_commissions table does not exist, nothing to update');
      return results;
    }
    
    // Get all SIGNUP commission records
    const [commissions] = await connection.execute(`
      SELECT 
        id, 
        agent_id, 
        customer_id, 
        package_type, 
        premium_amount, 
        commission_percentage,
        commission_amount,
        commission_type
      FROM agent_commissions
      WHERE commission_type = 'SIGNUP'
    `);
    
    results.recordsFound = commissions.length;
    console.log(`Found ${commissions.length} SIGNUP commission records to update`);
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      // Update each commission record
      for (const commission of commissions) {
        // Skip if already at correct percentage
        if (parseFloat(commission.commission_percentage) === COMMISSION_PERCENTAGES.SIGNUP) {
          console.log(`Commission ID ${commission.id} already at correct percentage (30%), skipping`);
          continue;
        }
        
        // Get premium amount (use record value or lookup from pricing table)
        const premiumAmount = parseFloat(commission.premium_amount) || 
          PACKAGE_PRICING[commission.package_type] || 350;
          
        // Calculate new commission amount based on 30%
        const newCommissionAmount = (premiumAmount * COMMISSION_PERCENTAGES.SIGNUP / 100).toFixed(2);
        
        // Update the record
        await connection.execute(`
          UPDATE agent_commissions
          SET 
            commission_percentage = ?,
            commission_amount = ?
          WHERE id = ?
        `, [
          COMMISSION_PERCENTAGES.SIGNUP,
          newCommissionAmount,
          commission.id
        ]);
        
        results.recordsUpdated++;
        console.log(`Updated commission ID ${commission.id}: ${commission.commission_percentage}% -> 30%, amount: ${commission.commission_amount} -> ${newCommissionAmount}`);
      }
      
      // Commit transaction
      await connection.commit();
      console.log(`Successfully updated ${results.recordsUpdated} commission records`);
      
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      console.error('Error updating commission records:', error);
      results.errors.push(error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('Error in update process:', error);
    results.errors.push(error.message);
  } finally {
    // Close connection
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
  
  return results;
}

// Self-invocation for direct execution (ES modules)
if (import.meta.url === import.meta.resolve('./update-commission-percentage.js')) {
  updateCommissionPercentages()
    .then(results => {
      console.log('Update completed with results:', results);
      process.exit(0);
    })
    .catch(error => {
      console.error('Update failed:', error);
      process.exit(1);
    });
}

export default updateCommissionPercentages;
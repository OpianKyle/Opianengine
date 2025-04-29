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
const COMMISSION_PERCENTAGE = {
  AGENT: 30, // 30% for agents
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
    
    console.log(`Found ${commissions.length} SIGNUP commission records to check`);
    results.recordsFound = commissions.length;
    
    // Update each commission record with the correct percentage and amount
    for (const commission of commissions) {
      try {
        const newPercentage = COMMISSION_PERCENTAGE.AGENT; // 30%
        
        // Get the premium amount - use the stored value or fallback to package price
        const premiumAmount = commission.premium_amount || 
          PACKAGE_PRICING[commission.package_type] || 350;
        
        // Calculate the new commission amount
        const newCommissionAmount = (premiumAmount * newPercentage / 100).toFixed(2);
        
        // Only update if the percentage isn't already 30%
        if (Number(commission.commission_percentage) !== newPercentage) {
          await connection.execute(`
            UPDATE agent_commissions
            SET commission_percentage = ?,
                commission_amount = ?
            WHERE id = ?
          `, [newPercentage, newCommissionAmount, commission.id]);
          
          console.log(`Updated commission ID ${commission.id}: ${commission.commission_percentage}% -> ${newPercentage}%, amount: R${commission.commission_amount} -> R${newCommissionAmount}`);
          results.recordsUpdated++;
        } else {
          console.log(`Commission ID ${commission.id} already has correct percentage (${newPercentage}%)`);
        }
      } catch (error) {
        console.error(`Error updating commission ID ${commission.id}:`, error);
        results.errors.push({
          commissionId: commission.id,
          error: error.message
        });
      }
    }
    
    console.log(`Update complete: ${results.recordsUpdated} records updated`);
    
  } catch (error) {
    console.error('Error during commission update:', error);
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

// Run the function
async function main() {
  try {
    const results = await updateCommissionPercentages();
    console.log('Update commission percentages results:', results);
  } catch (error) {
    console.error('Error running commission percentage update:', error);
  }
}

main();
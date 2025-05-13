import { Router, Request, Response } from 'express';
import { checkAdmin } from '../auth';
import mysql from 'mysql2/promise';
import { logAdminAction } from '../admin-logger';
// We'll dynamically import the CommonJS modules in the route handlers

const router = Router();

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
  AGENT: 30, // 30% for initial sign-ups
  RENEWAL: 10 // 10% for renewals
};

/**
 * Admin route to update all agent commission percentages to 30%
 * Fixes any inconsistencies in the database
 */
router.post('/fix-commission-percentages', checkAdmin, async (req: Request, res: Response) => {
  let connection;
  const results = {
    success: true,
    recordsFound: 0,
    recordsUpdated: 0,
    errors: []
  };
  
  try {
    console.log('Admin triggered commission percentage update...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
      user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'opian',
      port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
      connectTimeout: 30000, // 30 second timeout
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
      return res.json({ 
        success: false, 
        message: 'Agent commissions table does not exist' 
      });
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
    
    res.json(results);
  } catch (error) {
    console.error('Error during commission update:', error);
    results.success = false;
    results.errors.push({
      general: true,
      error: error.message
    });
    res.status(500).json(results);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
});

/**
 * Admin route to convert all SIGNUP commissions from last month to RENEWAL type
 * This changes the commission type and recalculates the commission amount based on
 * the 10% renewal rate instead of the 30% signup rate
 */
router.post('/convert-signups-to-renewals', checkAdmin, async (req: Request, res: Response) => {
  try {
    console.log('Admin triggered conversion of SIGNUP commissions to RENEWAL');
    
    // Get user for logging
    const adminUser = req.user;
    
    // Dynamically import the conversion module
    const module = await import('../../scripts/convert-signups-to-renewals.js');
    const { convertSignupToRenewal } = module;
    
    // Call the conversion function
    const results = await convertSignupToRenewal();
    
    // Log the admin action
    if (adminUser && adminUser.id) {
      await logAdminAction({
        adminId: adminUser.id,
        actionType: "PROCESS_RENEWALS",
        details: `Converted ${results.recordsConverted} SIGNUP commissions to RENEWAL type with 10% rate`
      });
    }
    
    console.log('Conversion complete with results:', results);
    
    // Return the results to the client
    res.json(results);
  } catch (error) {
    console.error('Error during conversion process:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during the conversion process'
    });
  }
});

/**
 * Admin route to convert ALL SIGNUP commissions to RENEWAL type (one-time operation)
 * This is a special endpoint that converts all signup commissions, regardless of date
 */
router.post('/convert-all-signups-to-renewals', checkAdmin, async (req: Request, res: Response) => {
  try {
    console.log('ADMIN TRIGGERED ONE-TIME CONVERSION OF ALL SIGNUP COMMISSIONS TO RENEWAL');
    console.log('⚠️ This is a high-impact operation that affects all signup commissions!');
    
    // Get user for logging
    const adminUser = req.user;
    
    // Dynamically import the conversion module
    const module = await import('../../scripts/convert-all-signups-to-renewals.js');
    const { convertAllSignupsToRenewal } = module;
    
    // Call the all-conversion function
    const results = await convertAllSignupsToRenewal();
    
    // Log the admin action
    if (adminUser && adminUser.id) {
      await logAdminAction({
        adminId: adminUser.id,
        actionType: "PROCESS_RENEWALS", // Changed to match existing action type
        details: `ONE-TIME OPERATION: Converted ${results.recordsConverted} SIGNUP commissions to RENEWAL type with 10% rate`
      });
    }
    
    console.log('One-time conversion complete with results:', results);
    
    // Return the results to the client
    res.json(results);
  } catch (error) {
    console.error('Error during one-time conversion process:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during the one-time conversion process'
    });
  }
});

export default router;
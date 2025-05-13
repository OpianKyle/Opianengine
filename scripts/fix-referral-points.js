/**
 * Fix Referral Points Script
 * 
 * This script checks for all users with referrals and ensures they have received 
 * the proper 2000 points per referral. If points are missing, it adds them and 
 * creates the appropriate transaction records.
 */

// Import MySQL connection
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function createConnection() {
  try {
    return await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'opianrewards',
      port: process.env.DB_PORT || 3306,
    });
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function fixReferralPoints() {
  console.log('Starting Referral Points Fix Script');
  
  const connection = await createConnection();
  try {
    // Step 1: Get all users with their referral codes
    const [allUsers] = await connection.execute(
      'SELECT id, email, referral_code, points FROM users WHERE referral_code IS NOT NULL AND is_enabled = 1'
    );
    
    console.log(`Found ${allUsers.length} users with referral codes`);
    
    // Initialize counters
    let totalUsersWithReferrals = 0;
    let totalReferralsFound = 0;
    let totalMissingPoints = 0;
    let totalPointsAdded = 0;
    let totalTransactionsAdded = 0;
    
    // Step 2: For each user, check how many referrals they have
    for (const user of allUsers) {
      const userId = user.id;
      const userEmail = user.email;
      const referralCode = user.referral_code;
      const currentPoints = user.points || 0;
      
      console.log(`\nChecking referrals for user ${userId} (${userEmail}) with code ${referralCode}`);
      
      // Find all users referred by this user's referral code
      const [referredUsers] = await connection.execute(
        'SELECT id, email, created_at FROM users WHERE referred_by = ?',
        [referralCode]
      );
      
      if (referredUsers.length === 0) {
        console.log(`  No referrals found for user ${userId}`);
        continue;
      }
      
      totalUsersWithReferrals++;
      totalReferralsFound += referredUsers.length;
      
      console.log(`  Found ${referredUsers.length} referrals`);
      
      // Check existing referral bonus transactions
      const [existingTransactions] = await connection.execute(
        'SELECT id, points FROM transactions WHERE user_id = ? AND type = ? AND status = ?',
        [userId, 'REFERRAL_BONUS', 'PROCESSED']
      );
      
      const existingPoints = existingTransactions.reduce((sum, tx) => sum + (tx.points || 0), 0);
      console.log(`  Existing referral points: ${existingPoints}`);
      
      // Calculate expected points (2000 per referral)
      const expectedPoints = referredUsers.length * 2000;
      console.log(`  Expected referral points: ${expectedPoints}`);
      
      // If there's a discrepancy, add the missing points
      if (expectedPoints > existingPoints) {
        const missingPoints = expectedPoints - existingPoints;
        totalMissingPoints += missingPoints;
        
        console.log(`  Missing ${missingPoints} points for user ${userId} - Adding now...`);
        
        // Start a transaction
        await connection.beginTransaction();
        
        try {
          // Add the missing points to the user
          await connection.execute(
            'UPDATE users SET points = points + ? WHERE id = ?',
            [missingPoints, userId]
          );
          
          // Create a transaction record for the missing points
          await connection.execute(
            `INSERT INTO transactions (
              user_id, points, type, description, status, created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              userId,
              missingPoints,
              'REFERRAL_BONUS',
              `[CORRECTION] Added missing referral points for ${referredUsers.length} referrals`,
              'PROCESSED'
            ]
          );
          
          // Commit the transaction
          await connection.commit();
          
          totalPointsAdded += missingPoints;
          totalTransactionsAdded++;
          
          console.log(`  ✅ Added ${missingPoints} points to user ${userId} successfully`);
        } catch (error) {
          // Rollback in case of error
          await connection.rollback();
          console.error(`  Error adding points to user ${userId}:`, error);
        }
      } else {
        console.log(`  ✅ User ${userId} already has the correct number of referral points`);
      }
    }
    
    // Print summary
    console.log('\n========== SUMMARY ==========');
    console.log(`Total users with referral codes: ${allUsers.length}`);
    console.log(`Total users with referrals: ${totalUsersWithReferrals}`);
    console.log(`Total referrals found: ${totalReferralsFound}`);
    console.log(`Total missing points identified: ${totalMissingPoints}`);
    console.log(`Total points added: ${totalPointsAdded}`);
    console.log(`Total correction transactions added: ${totalTransactionsAdded}`);
    console.log('==============================');
    
    return {
      totalUsersWithReferrals,
      totalReferralsFound,
      totalMissingPoints,
      totalPointsAdded, 
      totalTransactionsAdded
    };
  } catch (error) {
    console.error('Error in fix referral points script:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the script if it's the main module
if (import.meta.url === import.meta.main) {
  fixReferralPoints()
    .then(result => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
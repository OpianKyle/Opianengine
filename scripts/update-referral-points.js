/**
 * Update Referral Points Script
 * 
 * This script updates all existing referral transactions to use a fixed 2000 points value.
 * It also recalculates user point totals to reflect the updated referral points.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function updateReferralPoints() {
  console.log('Starting referral points update process...');
  let connection;

  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || process.env.DB_HOST,
      port: process.env.MYSQL_PORT || process.env.DB_PORT || 3306,
      user: process.env.MYSQL_USER || process.env.DB_USER,
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
    });

    console.log('Connected to database successfully');

    // Start a transaction to ensure data consistency
    await connection.beginTransaction();

    // Step 1: Get all referral transactions
    const [referralTransactions] = await connection.execute(
      `SELECT id, user_id, amount, description 
       FROM transactions 
       WHERE type = 'REFERRAL_BONUS'`
    );

    console.log(`Found ${referralTransactions.length} referral transactions to update`);

    // Track users whose points need to be recalculated
    const usersToUpdate = new Set();
    const updates = [];

    // Step 2: Update each transaction to have 2000 points
    for (const transaction of referralTransactions) {
      const oldAmount = parseFloat(transaction.amount);
      const difference = 2000 - oldAmount;
      
      // Only update if the points are different from 2000
      if (Math.abs(difference) > 0.01) {
        usersToUpdate.add(transaction.user_id);
        updates.push({
          transactionId: transaction.id,
          userId: transaction.user_id,
          oldAmount,
          newAmount: 2000,
          difference
        });

        // Update the transaction to have 2000 points
        await connection.execute(
          'UPDATE transactions SET amount = ? WHERE id = ?',
          [2000, transaction.id]
        );

        console.log(`Updated transaction ${transaction.id} from ${oldAmount} to 2000 points (diff: ${difference})`);
      }
    }

    // Step 3: Recalculate total points for affected users
    for (const userId of usersToUpdate) {
      // Get total points from transactions for this user
      const [pointsResult] = await connection.execute(
        'SELECT SUM(amount) as total FROM transactions WHERE user_id = ?',
        [userId]
      );
      
      const newTotal = pointsResult[0].total;
      
      // Update user's points
      await connection.execute(
        'UPDATE users SET points = ? WHERE id = ?',
        [newTotal, userId]
      );
      
      console.log(`Updated user ${userId} points to ${newTotal}`);
    }

    // Commit the transaction
    await connection.commit();
    
    console.log('Successfully updated referral points');
    console.log(`Updated ${updates.length} transactions for ${usersToUpdate.size} users`);
    
    return {
      success: true,
      updatedTransactions: updates.length,
      updatedUsers: usersToUpdate.size,
      updates
    };

  } catch (error) {
    console.error('Error updating referral points:', error);
    
    // Roll back the transaction if there was an error
    if (connection) {
      await connection.rollback();
    }
    
    return { success: false, error: error.message };
  } finally {
    // Close the database connection
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script when directly executed via node
// In ES modules, this pattern is used instead of checking require.main === module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  updateReferralPoints()
    .then(result => {
      console.log('Script execution completed:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}

// Export for use in other modules
export { updateReferralPoints };
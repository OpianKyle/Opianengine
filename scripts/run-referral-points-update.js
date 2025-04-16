/**
 * Run Referral Points Update Script
 * 
 * This script imports and runs the update-referral-points.js script
 * to update all existing referral transactions to use exactly 2000 points.
 */

import { updateReferralPoints } from './update-referral-points.js';

async function runUpdate() {
  console.log('Starting the referral points update process...');
  
  try {
    const result = await updateReferralPoints();
    
    if (result.success) {
      console.log('✅ Referral points update completed successfully!');
      console.log(`Updated ${result.updatedTransactions} transactions for ${result.updatedUsers} users.`);
      
      if (result.updates.length > 0) {
        console.log('\nDetailed updates:');
        result.updates.forEach(update => {
          console.log(`- User ${update.userId}: Transaction ${update.transactionId} changed from ${update.oldAmount} to 2000 points (diff: ${update.difference})`);
        });
      } else {
        console.log('No transactions needed updating - all referral transactions already have 2000 points.');
      }
    } else {
      console.error('❌ Referral points update failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error running referral points update:', error);
  }
}

// Run the script
runUpdate()
  .then(() => {
    console.log('Update script execution completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Update script failed:', err);
    process.exit(1);
  });
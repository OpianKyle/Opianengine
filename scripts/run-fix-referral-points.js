/**
 * Run Fix Referral Points Script
 * 
 * This script imports and runs the fix-referral-points.js script
 * to correct any missing referral points for users with referrals.
 */

import { fixReferralPoints } from './fix-referral-points.js';

async function runFix() {
  try {
    console.log('Starting fix referral points script...');
    const result = await fixReferralPoints();
    console.log('Fix referral points script completed successfully:', result);
    process.exit(0);
  } catch (error) {
    console.error('Error running fix referral points script:', error);
    process.exit(1);
  }
}

runFix();
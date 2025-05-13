/**
 * Run Commission Migration Script
 * 
 * This script imports and runs the update-commission-percentage.js script
 * to update all existing commission records to use the correct 30% rate.
 */

import updateCommissionPercentages from './update-commission-percentage.js';

async function runMigration() {
  console.log('Starting commission percentage migration...');
  
  try {
    const results = await updateCommissionPercentages();
    
    console.log('Migration completed successfully!');
    console.log('Summary:');
    console.log(`- Records found: ${results.recordsFound}`);
    console.log(`- Records updated: ${results.recordsUpdated}`);
    
    if (results.errors.length > 0) {
      console.log('Errors encountered:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    return results;
  } catch (error) {
    console.error('Migration failed:', error);
    return { 
      recordsFound: 0, 
      recordsUpdated: 0, 
      errors: [error.message || 'Unknown error'] 
    };
  }
}

// Self-invocation for direct execution (ES modules)
if (import.meta.url === import.meta.resolve('./run-commission-migration.js')) {
  runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default runMigration;
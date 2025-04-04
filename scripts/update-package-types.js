/**
 * Script to update package types in the agent_commissions table
 * 
 * This script alters the agent_commissions table to use consistent package types:
 * - OPPORTUNITY (previously BASIC/STANDARD)
 * - MOMENTUM
 * - PROSPER (previously PREMIUM)
 * - PRESTIGE (previously ELITE)
 * - PINNACLE (previously EXECUTIVE)
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function updatePackageTypes() {
  let connection;
  
  try {
    console.log('Starting package type update migration...');
    
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
    
    // Check if agent_commissions table exists
    const [tableCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'agent_commissions'
    `);
    
    if (tableCheck[0].count === 0) {
      console.log('agent_commissions table does not exist, nothing to update');
      return;
    }
    
    // Get current column definition
    const [enumCheck] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_commissions' 
      AND COLUMN_NAME = 'package_type'
    `);
    
    const packageTypeEnum = enumCheck[0].COLUMN_TYPE;
    console.log('Current package_type enum:', packageTypeEnum);
    
    // Update records with old package types to new ones
    const updateQueries = [
      // BASIC/STANDARD -> OPPORTUNITY
      `UPDATE agent_commissions SET package_type = 'OPPORTUNITY' 
       WHERE package_type IN ('BASIC', 'STANDARD') 
       AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')`,
       
      // PREMIUM -> PROSPER
      `UPDATE agent_commissions SET package_type = 'PROSPER' 
       WHERE package_type = 'PREMIUM' 
       AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')`,
       
      // ELITE -> PRESTIGE
      `UPDATE agent_commissions SET package_type = 'PRESTIGE' 
       WHERE package_type = 'ELITE' 
       AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')`,
       
      // EXECUTIVE -> PINNACLE
      `UPDATE agent_commissions SET package_type = 'PINNACLE' 
       WHERE package_type = 'EXECUTIVE' 
       AND package_type NOT IN ('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE')`
    ];
    
    // Execute update queries
    let updatedRecords = 0;
    for (const query of updateQueries) {
      const [result] = await connection.execute(query);
      console.log(`Updated ${result.affectedRows} records with query: ${query.substring(0, 70)}...`);
      updatedRecords += result.affectedRows;
    }
    
    // Now modify the enum to only include the new values
    try {
      await connection.execute(`
        ALTER TABLE agent_commissions 
        MODIFY COLUMN package_type ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL
      `);
      console.log('Successfully updated package_type column to use only the new enum values');
    } catch (error) {
      console.error('Error updating package_type column:', error.message);
      throw error;
    }
    
    console.log(`Migration completed successfully. Updated ${updatedRecords} records.`);
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Execute the function if running this script directly (but not when in production build)
if (import.meta.url === `file://${process.argv[1]}` && process.env.NODE_ENV !== 'production') {
  updatePackageTypes()
    .then(() => {
      console.log('Package type update script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Package type update script failed:', error.message);
      process.exit(1);
    });
}

// Export for use as a module
export { updatePackageTypes };
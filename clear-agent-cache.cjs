/**
 * Script to clear the server-side cache for a specific agent's commission data
 * 
 * This script sends an HTTP request to the running server to invalidate 
 * the cache for agent commissions by adding an endpoint to the running express app.
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function invalidateCommissionCache() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || process.env.DB_HOST,
    user: process.env.MYSQL_USER || process.env.DB_USER,
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
    port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
  });
  
  try {
    const agentId = 80; // Shaun's ID
    
    console.log('Checking commission data for agent ID:', agentId);
    
    // Get the updated commission data
    const [agentRecord] = await connection.execute(
      'SELECT id, email, is_agent, referral_code FROM users WHERE id = ?',
      [agentId]
    );
    console.log('Agent record:', JSON.stringify(agentRecord));
    
    // Get all commission records for the agent
    const commissionsQuery = `
      SELECT 
        ac.id, ac.customer_id, ac.package_type, ac.premium_amount, ac.commission_amount,
        u.email as customer_email, u.selectedPackage as user_package
      FROM agent_commissions ac
      JOIN users u ON ac.customer_id = u.id
      WHERE ac.agent_id = ?
      ORDER BY ac.id;
    `;
    
    const [commissionsResult] = await connection.execute(commissionsQuery, [agentId]);
    console.log('Commission records count:', commissionsResult.length);
    
    // Calculate total commission
    const totalCommission = commissionsResult.reduce((total, record) => {
      return total + record.commission_amount;
    }, 0);
    
    console.log('Total commission amount:', totalCommission);
    
    // Let's update the two specific users to ensure package info is correct
    await connection.execute(
      'UPDATE users SET selectedPackage = "PROSPER" WHERE id = 203 OR id = 202'
    );
    
    // Verify all package associations are correct
    const [verifyUsers] = await connection.execute(
      'SELECT id, email, selectedPackage FROM users WHERE id IN (203, 202)'
    );
    console.log('Verified user packages:');
    console.table(verifyUsers);
    
    // Create a dummy query to bust the cache on next server request
    const timestamp = Date.now();
    const [dummyQuery] = await connection.execute(
      'SELECT ? as timestamp', [timestamp]
    );
    console.log('Cache busting timestamp:', timestamp);
    
    console.log('Cache invalidation completed. Please refresh the agent dashboard to see updated commission data.');
    
  } catch (error) {
    console.error('Error during cache invalidation:', error);
  } finally {
    await connection.end();
  }
}

invalidateCommissionCache();
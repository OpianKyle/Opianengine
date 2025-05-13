/**
 * This script checks the agent commissions for specific customers
 * to verify that they have been properly updated with correct values
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function createConnection() {
  try {
    // Use hardcoded credentials from the codebase
    const dbConfig = {
      host: 'dedi1350.jnb1.host-h.net',
      user: 'admin',
      password: '8E33U976qa800F',
      database: 'opianrewards',
      port: 3306,
      ssl: {
        rejectUnauthorized: false
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    const pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    console.log('Successfully connected to MariaDB');
    
    return connection;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

async function checkCommissionsForAgent(agentId) {
  const connection = await createConnection();
  try {
    console.log(`Checking commissions for agent ID: ${agentId}`);
    
    // Check agent info
    const [agentInfo] = await connection.execute(
      `SELECT id, email, is_agent, referral_code FROM users WHERE id = ?`,
      [agentId]
    );
    
    console.log('Agent record:', agentInfo);
    
    // Get total commissions and details
    const [commissions] = await connection.execute(
      `SELECT 
        ac.id,
        ac.package_type,
        ac.premium_amount,
        ac.commission_amount,
        ac.commission_percentage,
        ac.commission_type,
        ac.status,
        ac.created_at,
        u.first_name,
        u.last_name,
        u.email,
        u.selected_package
      FROM agent_commissions ac
      JOIN users u ON ac.customer_id = u.id
      WHERE ac.agent_id = ?
      ORDER BY ac.created_at DESC`,
      [agentId]
    );
    
    console.log(`Found ${commissions.length} commission records`);
    
    // Calculate total commission amount
    const totalCommissionAmount = commissions.reduce((sum, comm) => {
      return sum + Number(comm.commission_amount);
    }, 0);
    
    console.log(`Total commission amount: R${totalCommissionAmount.toFixed(2)}`);
    
    // Check specific customers of interest
    const targetEmails = [
      'racubulelwa@gmail.com',
      'nosiphopearlmoloi2018@gmail.com'
    ];
    
    // Filter commissions for the specific target customers
    const targetCommissions = commissions.filter(commission => 
      targetEmails.includes(commission.email)
    );
    
    console.log('\nTARGET CUSTOMERS COMMISSION DETAILS:');
    targetCommissions.forEach(comm => {
      console.log(`-----------------------------------------`);
      console.log(`Customer: ${comm.first_name} ${comm.last_name} (${comm.email})`);
      console.log(`Package: ${comm.package_type} (DB package: ${comm.selected_package})`);
      console.log(`Amount: R${Number(comm.premium_amount).toFixed(2)}`);
      console.log(`Commission: R${Number(comm.commission_amount).toFixed(2)} (${comm.commission_percentage}%)`);
      console.log(`Status: ${comm.status}`);
      console.log(`-----------------------------------------`);
    });
    
    // Check user package types in the users table
    const [userPackages] = await connection.execute(
      `SELECT id, email, selected_package 
       FROM users 
       WHERE email IN (?) AND agent_id = ?`,
      [targetEmails, agentId]
    );
    
    console.log('\nUSER PACKAGE SETTINGS:');
    userPackages.forEach(user => {
      console.log(`${user.email}: ${user.selected_package}`);
    });
    
    return {
      agentInfo: agentInfo[0],
      totalCommissionAmount,
      commissionCount: commissions.length,
      targetCommissions
    };
  } finally {
    connection.end();
  }
}

async function main() {
  try {
    const SHAUN_AGENT_ID = 80;
    const result = await checkCommissionsForAgent(SHAUN_AGENT_ID);
    console.log('\nSUMMARY:');
    console.log(`Agent ${result.agentInfo.email} has ${result.commissionCount} commissions`);
    console.log(`Total commission amount: R${result.totalCommissionAmount.toFixed(2)}`);
  } catch (error) {
    console.error('Error running commission verification script:', error);
  }
}

main();
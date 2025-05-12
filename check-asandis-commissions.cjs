/**
 * This script checks the commissions for the agent with email asandiswam@opianrewards.com
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createConnection() {
  return await mysql.createConnection({
    host: 'dedi1350.jnb1.host-h.net',
    user: 'admin',
    password: '8E33U976qa800F',
    database: 'opianrewards',
    port: 3306,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

async function checkCommissions() {
  const connection = await createConnection();
  console.log('Connected to database successfully');
  
  try {
    // First, get the agent information
    const [agentRows] = await connection.execute(
      'SELECT id, email, is_agent, first_name, last_name FROM users WHERE email = ?',
      ['asandiswam@opianrewards.com']
    );
    
    if (!agentRows.length) {
      console.log('Agent not found with email asandiswam@opianrewards.com');
      return;
    }
    
    const agent = agentRows[0];
    console.log('Agent found:', agent);
    
    // Check if this user is actually marked as an agent
    if (!agent.is_agent) {
      console.log('This user is not marked as an agent (is_agent = 0)');
    }
    
    // Get the customers referred by this agent
    const [customerRows] = await connection.execute(
      'SELECT id, first_name, last_name, email, created_at, agent_id, selected_package FROM users WHERE agent_id = ?',
      [agent.id]
    );
    
    console.log(`Found ${customerRows.length} customers referred by this agent:`);
    customerRows.forEach(customer => {
      console.log(`- ${customer.first_name} ${customer.last_name} (${customer.email}), Package: ${customer.selected_package}, Created: ${customer.created_at}`);
    });
    
    // Check agent_commissions table
    const [commissionRows] = await connection.execute(
      'SELECT * FROM agent_commissions WHERE agent_id = ?',
      [agent.id]
    );
    
    console.log(`\nFound ${commissionRows.length} commission records for this agent:`);
    let totalCommission = 0;
    commissionRows.forEach(commission => {
      console.log(`- ID: ${commission.id}, User: ${commission.user_id}, Type: ${commission.commission_type}, Amount: R${commission.commission_amount}, Created: ${commission.created_at}`);
      totalCommission += parseFloat(commission.commission_amount || 0);
    });
    
    console.log(`\nTotal commission amount: R${totalCommission.toFixed(2)}`);
    
    // Show calculation based on package prices
    console.log('\nExpected commission calculation:');
    const packageRates = {
      'OPPORTUNITY': 350,
      'MOMENTUM': 450, 
      'PROSPER': 550,
      'PRESTIGE': 695,
      'PINNACLE': 825
    };
    
    let expectedTotalCommission = 0;
    customerRows.forEach(customer => {
      const packagePrice = packageRates[customer.selected_package] || 0;
      const commissionRate = 0.3; // 30% for signup
      const expectedCommission = packagePrice * commissionRate;
      expectedTotalCommission += expectedCommission;
      
      console.log(`- ${customer.first_name} ${customer.last_name} (${customer.selected_package}): R${packagePrice} x ${commissionRate * 100}% = R${expectedCommission.toFixed(2)}`);
    });
    
    console.log(`\nExpected total commission: R${expectedTotalCommission.toFixed(2)}`);
    
    // Now check if there's any issue with commission calculations
    if (Math.abs(totalCommission - expectedTotalCommission) > 0.01) {
      console.log('\nISSUE DETECTED: Actual commission does not match expected commission');
      // Check if commission records exist for each customer
      const userIds = customerRows.map(c => c.id);
      const commissionsForUsers = commissionRows.map(c => c.user_id);
      
      const missingCommissions = userIds.filter(id => !commissionsForUsers.includes(id));
      if (missingCommissions.length) {
        console.log(`\nFound ${missingCommissions.length} customers with missing commission records:`);
        missingCommissions.forEach(id => {
          const customer = customerRows.find(c => c.id === id);
          console.log(`- ${customer.first_name} ${customer.last_name} (${customer.email}), Package: ${customer.selected_package}`);
        });
      }
      
      // Check for zero commission amounts
      const zeroCommissions = commissionRows.filter(c => parseFloat(c.commission_amount || 0) === 0);
      if (zeroCommissions.length) {
        console.log(`\nFound ${zeroCommissions.length} commission records with zero amounts:`);
        zeroCommissions.forEach(commission => {
          console.log(`- Commission ID: ${commission.id}, User ID: ${commission.user_id}, Type: ${commission.commission_type}, Created: ${commission.created_at}`);
          
          // Get more details about this customer
          const customer = customerRows.find(c => c.id === commission.user_id);
          if (customer) {
            console.log(`  Customer: ${customer.first_name} ${customer.last_name}, Package: ${customer.selected_package}`);
          }
        });
      }
    }

  } catch (error) {
    console.error('Error checking commissions:', error);
  } finally {
    await connection.end();
  }
}

// Run the function
checkCommissions()
  .then(() => console.log('Done checking commissions'))
  .catch(err => console.error('Error in main execution:', err));
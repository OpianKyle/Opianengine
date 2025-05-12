/**
 * This script fixes the commissions for the agent with email asandiswam@opianrewards.com
 * by adding missing commission records
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

async function fixCommissions() {
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
    
    // Get the customers referred by this agent
    const [customerRows] = await connection.execute(
      'SELECT id, first_name, last_name, email, created_at, agent_id, selected_package FROM users WHERE agent_id = ?',
      [agent.id]
    );
    
    console.log(`Found ${customerRows.length} customers referred by this agent`);
    
    // Check agent_commissions table
    const [commissionRows] = await connection.execute(
      'SELECT * FROM agent_commissions WHERE agent_id = ?',
      [agent.id]
    );
    
    console.log(`Found ${commissionRows.length} existing commission records for this agent`);
    
    // Calculate commissions to add
    const packageRates = {
      'OPPORTUNITY': 350,
      'MOMENTUM': 450, 
      'PROSPER': 550,
      'PRESTIGE': 695,
      'PINNACLE': 825
    };
    
    // Create a list of existing customer IDs in the commission table
    const existingCommissionCustomerIds = commissionRows.map(c => c.customer_id);
    
    // Filter customers without commission records
    const customersWithoutCommission = customerRows.filter(customer => 
      !existingCommissionCustomerIds.includes(customer.id)
    );
    
    console.log(`Found ${customersWithoutCommission.length} customers without commission records`);
    
    // Add commissions for each customer
    for (const customer of customersWithoutCommission) {
      const packagePrice = packageRates[customer.selected_package] || 0;
      const commissionRate = 0.3; // 30% for signup
      const commissionAmount = packagePrice * commissionRate;
      
      console.log(`Adding commission for ${customer.first_name} ${customer.last_name} (${customer.email}): R${commissionAmount.toFixed(2)}`);
      
      try {
        // Insert the commission record
        await connection.execute(
          'INSERT INTO agent_commissions (agent_id, customer_id, commission_type, package_type, premium_amount, commission_percentage, commission_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [agent.id, customer.id, 'SIGNUP', customer.selected_package, packagePrice, 30, commissionAmount, 'PENDING']
        );
        
        console.log(`Commission record added successfully`);
      } catch (insertError) {
        console.error(`Error adding commission record:`, insertError);
      }
    }
    
    // Verify commissions were added
    const [updatedCommissionRows] = await connection.execute(
      'SELECT * FROM agent_commissions WHERE agent_id = ?',
      [agent.id]
    );
    
    console.log(`\nNow found ${updatedCommissionRows.length} commission records for this agent:`);
    let totalCommission = 0;
    updatedCommissionRows.forEach(commission => {
      console.log(`- ID: ${commission.id}, Customer: ${commission.customer_id}, Type: ${commission.commission_type}, Package: ${commission.package_type}, Amount: R${commission.commission_amount}, Created: ${commission.created_at}`);
      totalCommission += parseFloat(commission.commission_amount || 0);
    });
    
    console.log(`\nTotal commission amount after fix: R${totalCommission.toFixed(2)}`);

  } catch (error) {
    console.error('Error fixing commissions:', error);
  } finally {
    await connection.end();
  }
}

// Run the function
fixCommissions()
  .then(() => console.log('Done fixing commissions'))
  .catch(err => console.error('Error in main execution:', err));
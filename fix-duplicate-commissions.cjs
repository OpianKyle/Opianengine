/**
 * This script fixes duplicate commission records by removing commissions
 * that were incorrectly assigned to sedzanim@opianrewards.com
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

async function fixDuplicateCommissions() {
  const connection = await createConnection();
  console.log('Connected to database successfully');
  
  try {
    // First, get the agent information for both agents
    const [agents] = await connection.execute(
      'SELECT id, email, first_name, last_name FROM users WHERE email IN (?, ?)',
      ['asandiswam@opianrewards.com', 'sedzanim@opianrewards.com']
    );
    
    if (agents.length !== 2) {
      console.log('Could not find both agents');
      return;
    }
    
    const asandiswa = agents.find(a => a.email === 'asandiswam@opianrewards.com');
    const sedzani = agents.find(a => a.email === 'sedzanim@opianrewards.com');
    
    console.log('Asandiswa (correct agent):', asandiswa);
    console.log('Sedzani (incorrect agent):', sedzani);
    
    // Get customers who belong to Asandiswa
    const [asandiswasCustomers] = await connection.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE agent_id = ?',
      [asandiswa.id]
    );
    
    console.log(`Found ${asandiswasCustomers.length} customers assigned to Asandiswa:`);
    asandiswasCustomers.forEach(c => {
      console.log(`- ${c.first_name} ${c.last_name} (${c.email}), ID: ${c.id}`);
    });
    
    // Get all commission records for these customers
    const customerIds = asandiswasCustomers.map(c => c.id);
    
    // Find commission records assigned to the wrong agent
    const [wrongCommissions] = await connection.execute(
      `SELECT * FROM agent_commissions 
       WHERE customer_id IN (${customerIds.join(',')}) 
       AND agent_id = ?`,
      [sedzani.id]
    );
    
    console.log(`\nFound ${wrongCommissions.length} commission records incorrectly assigned to Sedzani:`);
    wrongCommissions.forEach(comm => {
      console.log(`- Commission ID: ${comm.id}, Customer ID: ${comm.customer_id}, Amount: R${comm.commission_amount}`);
    });
    
    if (wrongCommissions.length === 0) {
      console.log('No incorrect commission records found. Nothing to fix.');
      return;
    }

    // Verify that correct commission records exist
    const [correctCommissions] = await connection.execute(
      `SELECT * FROM agent_commissions 
       WHERE customer_id IN (${customerIds.join(',')}) 
       AND agent_id = ?`,
      [asandiswa.id]
    );
    
    console.log(`\nFound ${correctCommissions.length} commission records correctly assigned to Asandiswa:`);
    correctCommissions.forEach(comm => {
      console.log(`- Commission ID: ${comm.id}, Customer ID: ${comm.customer_id}, Amount: R${comm.commission_amount}`);
    });
    
    // Check if we have correct commissions for all customers
    const correctCustomerIds = new Set(correctCommissions.map(c => c.customer_id));
    const missingCustomers = customerIds.filter(id => !correctCustomerIds.has(id));
    
    if (missingCustomers.length > 0) {
      console.log(`\nWARNING: Missing correct commission records for ${missingCustomers.length} customers.`);
      console.log('This script will only delete incorrect records if correct ones exist.');
      
      // Filter wrong commissions to only delete those with correct replacements
      const wrongCommissionsToDelete = wrongCommissions.filter(c => 
        correctCustomerIds.has(c.customer_id)
      );
      
      if (wrongCommissionsToDelete.length === 0) {
        console.log('No commissions can be safely deleted. Aborting.');
        return;
      }
      
      console.log(`\nWill delete ${wrongCommissionsToDelete.length} incorrect commission records.`);
      
      // Delete the wrong commission records that have correct replacements
      const wrongCommissionIds = wrongCommissionsToDelete.map(c => c.id);
      await connection.execute(
        `DELETE FROM agent_commissions WHERE id IN (${wrongCommissionIds.join(',')})`,
        []
      );
      
      console.log('Successfully deleted incorrect commission records.');
    } else {
      // Delete all wrong commission records
      const wrongCommissionIds = wrongCommissions.map(c => c.id);
      await connection.execute(
        `DELETE FROM agent_commissions WHERE id IN (${wrongCommissionIds.join(',')})`,
        []
      );
      
      console.log('Successfully deleted all incorrect commission records.');
    }
    
    // Verify the fix
    const [finalCommissions] = await connection.execute(
      `SELECT ac.*, u.email as agent_email
       FROM agent_commissions ac
       JOIN users u ON ac.agent_id = u.id
       WHERE customer_id IN (${customerIds.join(',')})`,
      []
    );
    
    console.log('\n===== VERIFICATION =====');
    console.log(`Found ${finalCommissions.length} commission records for Asandiswa's customers after fix:`);
    
    finalCommissions.forEach(comm => {
      console.log(`- Commission ID: ${comm.id}, Customer ID: ${comm.customer_id}, Agent: ${comm.agent_email}, Amount: R${comm.commission_amount}`);
    });
    
    // Calculate total commission for each agent
    const [asandiswaTotalCommission] = await connection.execute(
      'SELECT SUM(commission_amount) as total FROM agent_commissions WHERE agent_id = ?',
      [asandiswa.id]
    );
    
    const [sedzaniTotalCommission] = await connection.execute(
      'SELECT SUM(commission_amount) as total FROM agent_commissions WHERE agent_id = ?',
      [sedzani.id]
    );
    
    console.log(`\nTotal commission for Asandiswa: R${asandiswaTotalCommission[0].total || 0}`);
    console.log(`Total commission for Sedzani: R${sedzaniTotalCommission[0].total || 0}`);

  } catch (error) {
    console.error('Error fixing commissions:', error);
  } finally {
    await connection.end();
  }
}

// Run the function
fixDuplicateCommissions()
  .then(() => console.log('Done fixing duplicate commissions'))
  .catch(err => console.error('Error in main execution:', err));
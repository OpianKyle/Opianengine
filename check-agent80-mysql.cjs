const mysql = require('mysql2/promise');

async function checkAgent80() {
  console.log('Checking agent 80 leads in MariaDB...');
  
  const connection = await mysql.createConnection({
    host: 'dedi1350.jnb1.host-h.net',
    port: 3306,
    user: process.env.DATABASE_USER || 'opianrewards',
    password: process.env.DATABASE_PASSWORD,
    database: 'opianrewards'
  });
  
  try {
    // Check if agent 80 exists
    const [agentResult] = await connection.execute(`
      SELECT id, email, first_name, last_name, is_agent, is_enabled 
      FROM users WHERE id = 80
    `);
    
    if (agentResult.length > 0) {
      console.log('Agent 80 details:', agentResult[0]);
    } else {
      console.log('Agent 80 not found in users table');
    }
    
    // Check leads assigned to agent 80
    const [leadsResult] = await connection.execute(`
      SELECT id, first_name, last_name, email, status, assigned_agent_id, created_at
      FROM leads WHERE assigned_agent_id = 80
    `);
    
    console.log(`\nLeads assigned to agent 80: ${leadsResult.length}`);
    leadsResult.forEach(lead => {
      console.log(`- ID: ${lead.id}, Name: ${lead.first_name} ${lead.last_name}, Email: ${lead.email}, Status: ${lead.status}`);
    });
    
    // Check referral_leads table if it exists
    try {
      const [referralLeadsResult] = await connection.execute(`
        SELECT COUNT(*) as count FROM referral_leads WHERE assigned_agent_id = 80
      `);
      console.log(`\nReferral leads for agent 80: ${referralLeadsResult[0].count}`);
    } catch (error) {
      console.log('\nReferral_leads table not found or no leads for agent 80');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAgent80();

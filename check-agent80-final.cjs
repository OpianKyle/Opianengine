const mysql = require('mysql2/promise');

async function checkAgent80() {
  console.log('Checking agent 80 leads issue...');
  
  const connection = await mysql.createConnection({
    host: 'dedi1350.jnb1.host-h.net',
    user: 'admin',
    password: '8E33U976qa800F',
    database: 'opianrewards',
    port: 3306,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Check if agent 80 exists and is properly configured
    const [agentResult] = await connection.execute(`
      SELECT id, email, first_name, last_name, is_agent, is_enabled 
      FROM users WHERE id = 80
    `);
    
    if (agentResult.length > 0) {
      console.log('✅ Agent 80 found:', agentResult[0]);
    } else {
      console.log('❌ Agent 80 not found in users table');
      return;
    }
    
    // Check leads assigned to agent 80
    const [leadsResult] = await connection.execute(`
      SELECT id, first_name, last_name, email, status, assigned_agent_id, referral_code, created_at
      FROM leads WHERE assigned_agent_id = 80
      ORDER BY created_at DESC
    `);
    
    console.log(`\n📋 Leads assigned to agent 80: ${leadsResult.length}`);
    if (leadsResult.length > 0) {
      leadsResult.forEach(lead => {
        console.log(`  - ${lead.first_name} ${lead.last_name} (${lead.email}) - Status: ${lead.status}`);
      });
    } else {
      console.log('  No leads found assigned to agent 80');
    }
    
    // Check referral_leads table
    const [referralLeadsResult] = await connection.execute(`
      SELECT COUNT(*) as count FROM referral_leads
    `);
    console.log(`\n📨 Total referral leads in system: ${referralLeadsResult[0].count}`);
    
    // Check if there are unassigned leads with referral codes
    const [unassignedResult] = await connection.execute(`
      SELECT COUNT(*) as count FROM leads 
      WHERE assigned_agent_id IS NULL AND referral_code IS NOT NULL
    `);
    console.log(`🔍 Unassigned leads with referral codes: ${unassignedResult[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAgent80();

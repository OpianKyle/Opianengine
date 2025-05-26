const { Pool } = require('pg');

async function checkAgentLeads() {
  console.log('Checking agent 80 leads...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Check referral_leads table
    const referralLeadsResult = await pool.query(`
      SELECT COUNT(*) as count, r.*, u.email as referrer_email
      FROM referral_leads r
      LEFT JOIN users u ON u.referral_code = r.referral_code
      WHERE u.id = 80 OR u.agent_id = 80
    `);
    
    console.log('Referral leads for agent 80:', referralLeadsResult.rows);
    
    // Check main leads table
    const leadsResult = await pool.query(`
      SELECT * FROM leads WHERE assigned_agent_id = 80
    `);
    
    console.log('Main leads assigned to agent 80:', leadsResult.rows.length);
    leadsResult.rows.forEach(lead => {
      console.log(`- ${lead.first_name} ${lead.last_name} (${lead.email})`);
    });
    
    // Check if agent 80 exists and is enabled
    const agentResult = await pool.query(`
      SELECT id, email, first_name, last_name, is_agent, is_enabled 
      FROM users WHERE id = 80
    `);
    
    console.log('Agent 80 details:', agentResult.rows[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAgentLeads();

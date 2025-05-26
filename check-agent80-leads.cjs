const { Pool } = require('pg');

async function checkAgent80() {
  console.log('Checking agent 80 leads in PostgreSQL...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Check if agent 80 exists
    const agentResult = await pool.query(`
      SELECT id, email, first_name, last_name, is_agent, is_enabled 
      FROM users WHERE id = 80
    `);
    
    if (agentResult.rows.length > 0) {
      console.log('Agent 80 details:', agentResult.rows[0]);
    } else {
      console.log('Agent 80 not found in users table');
    }
    
    // Check leads assigned to agent 80
    const leadsResult = await pool.query(`
      SELECT id, first_name, last_name, email, status, assigned_agent_id, created_at
      FROM leads WHERE assigned_agent_id = 80
    `);
    
    console.log(`\nLeads assigned to agent 80: ${leadsResult.rows.length}`);
    leadsResult.rows.forEach(lead => {
      console.log(`- ID: ${lead.id}, Name: ${lead.first_name} ${lead.last_name}, Email: ${lead.email}, Status: ${lead.status}`);
    });
    
    // Check all leads to see assignment pattern
    const allLeadsResult = await pool.query(`
      SELECT assigned_agent_id, COUNT(*) as count
      FROM leads 
      WHERE assigned_agent_id IS NOT NULL
      GROUP BY assigned_agent_id
      ORDER BY count DESC
    `);
    
    console.log('\nLead assignments by agent:');
    allLeadsResult.rows.forEach(row => {
      console.log(`- Agent ${row.assigned_agent_id}: ${row.count} leads`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAgent80();

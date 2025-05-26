const mysql = require('mysql2/promise');

async function fixReferralAssignments() {
  console.log('Fixing referral lead assignments...');
  
  const connection = await mysql.createConnection({
    host: 'dedi1350.jnb1.host-h.net',
    user: 'admin',
    password: '8E33U976qa800F',
    database: 'opianrewards',
    port: 3306,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Get unassigned leads with referral codes
    const [unassignedLeads] = await connection.execute(`
      SELECT l.id, l.email, l.referral_code, l.first_name, l.last_name
      FROM leads l
      WHERE l.assigned_agent_id IS NULL 
      AND l.referral_code IS NOT NULL
      AND l.referral_code != ''
    `);
    
    console.log(`Found ${unassignedLeads.length} leads to assign`);
    let assignedCount = 0;
    
    for (const lead of unassignedLeads) {
      console.log(`\nProcessing: ${lead.first_name} ${lead.last_name} (${lead.email})`);
      console.log(`Referral code: ${lead.referral_code}`);
      
      // Find the user who owns this referral code
      const [referrerResult] = await connection.execute(`
        SELECT id, email, first_name, last_name, is_agent, agent_id, referred_by
        FROM users 
        WHERE referral_code = ? AND is_enabled = 1
      `, [lead.referral_code]);
      
      if (referrerResult.length === 0) {
        console.log(`  ❌ No user found with referral code ${lead.referral_code}`);
        continue;
      }
      
      const referrer = referrerResult[0];
      console.log(`  📧 Referrer: ${referrer.first_name} ${referrer.last_name} (${referrer.email})`);
      
      let agentId = null;
      
      // Check if referrer has agent_id field
      if (referrer.agent_id) {
        agentId = referrer.agent_id;
        console.log(`  ✅ Found agent via agent_id: ${agentId}`);
      }
      // Check if referrer is an agent
      else if (referrer.is_agent === 1) {
        agentId = referrer.id;
        console.log(`  ✅ Referrer is an agent: ${agentId}`);
      }
      // Follow referral chain
      else if (referrer.referred_by) {
        console.log(`  🔍 Following referral chain...`);
        
        let currentUserId = referrer.referred_by;
        let depth = 0;
        const maxDepth = 10;
        
        while (currentUserId && depth < maxDepth) {
          const [chainUserResult] = await connection.execute(`
            SELECT id, email, is_agent, referred_by
            FROM users 
            WHERE id = ? AND is_enabled = 1
          `, [currentUserId]);
          
          if (chainUserResult.length === 0) break;
          
          const chainUser = chainUserResult[0];
          
          if (chainUser.is_agent === 1) {
            agentId = chainUser.id;
            console.log(`  ✅ Found agent in chain: ${agentId} (${chainUser.email})`);
            break;
          }
          
          currentUserId = chainUser.referred_by;
          depth++;
        }
      }
      
      // Assign to default admin agent if no specific agent found
      if (!agentId) {
        const [adminAgentResult] = await connection.execute(`
          SELECT id, email FROM users 
          WHERE is_agent = 1 AND is_admin = 1 AND is_enabled = 1 
          LIMIT 1
        `);
        
        if (adminAgentResult.length > 0) {
          agentId = adminAgentResult[0].id;
          console.log(`  ✅ Assigned to admin agent: ${agentId} (${adminAgentResult[0].email})`);
        }
      }
      
      // Update the lead
      if (agentId) {
        await connection.execute(`
          UPDATE leads 
          SET assigned_agent_id = ?, updated_at = NOW()
          WHERE id = ?
        `, [agentId, lead.id]);
        
        assignedCount++;
        console.log(`  ✅ Lead ${lead.id} assigned to agent ${agentId}`);
      } else {
        console.log(`  ❌ No agent found for lead ${lead.id}`);
      }
    }
    
    console.log(`\n🎉 Assignment complete!`);
    console.log(`✅ Successfully assigned ${assignedCount} leads to agents`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixReferralAssignments();

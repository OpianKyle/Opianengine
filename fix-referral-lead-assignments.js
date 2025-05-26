/**
 * Fix referral lead assignments - assigns leads to proper agents
 */

const mysql = require('mysql2/promise');

async function createConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'opian_rewards',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
  });
  return connection;
}

async function fixReferralLeadAssignments() {
  console.log('Starting referral lead assignment fix...');
  
  const connection = await createConnection();
  try {
    console.log('Connected to database');
    
    // Get all leads that don't have an assigned agent but have a referral code
    const [unassignedLeads] = await connection.query(`
      SELECT l.id, l.email, l.referral_code, l.first_name, l.last_name
      FROM leads l
      WHERE l.assigned_agent_id IS NULL 
      AND l.referral_code IS NOT NULL
      AND l.referral_code != ''
    `);
    
    console.log(`Found ${unassignedLeads.length} leads without assigned agents`);
    
    let assignedCount = 0;
    
    for (const lead of unassignedLeads) {
      console.log(`\nProcessing lead: ${lead.first_name} ${lead.last_name} (${lead.email})`);
      console.log(`Referral code: ${lead.referral_code}`);
      
      // Find the user who owns this referral code
      const [referrerResult] = await connection.query(`
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
      
      // Method 1: Check if referrer has agent_id field set
      if (referrer.agent_id) {
        agentId = referrer.agent_id;
        console.log(`  ✅ Found agent via agent_id field: ${agentId}`);
      }
      // Method 2: Check if referrer is an agent themselves
      else if (referrer.is_agent === 1) {
        agentId = referrer.id;
        console.log(`  ✅ Referrer is an agent: ${agentId}`);
      }
      // Method 3: Follow referral chain to find an agent
      else if (referrer.referred_by) {
        console.log(`  🔍 Following referral chain from ${referrer.referred_by}...`);
        
        let currentUserId = referrer.referred_by;
        let depth = 0;
        const maxDepth = 10;
        
        while (currentUserId && depth < maxDepth) {
          const [chainUserResult] = await connection.query(`
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
      
      // If no agent found, try to assign to a default admin agent
      if (!agentId) {
        console.log(`  🔍 No agent found in chain, looking for admin agent...`);
        
        const [adminAgentResult] = await connection.query(`
          SELECT id, email
          FROM users 
          WHERE is_agent = 1 AND is_admin = 1 AND is_enabled = 1
          LIMIT 1
        `);
        
        if (adminAgentResult.length > 0) {
          agentId = adminAgentResult[0].id;
          console.log(`  ✅ Assigned to admin agent: ${agentId} (${adminAgentResult[0].email})`);
        }
      }
      
      // Update the lead with the found agent
      if (agentId) {
        await connection.query(`
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
    console.log(`❌ ${unassignedLeads.length - assignedCount} leads remain unassigned`);
    
  } catch (error) {
    console.error('Error fixing referral lead assignments:', error);
  } finally {
    await connection.end();
  }
}

fixReferralLeadAssignments().catch(console.error);
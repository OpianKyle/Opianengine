const mysql = require('mysql2/promise');

async function checkRecentReferrals() {
  console.log('Checking recent referrals and agent 160 leads...');
  
  const connection = await mysql.createConnection({
    host: 'dedi1350.jnb1.host-h.net',
    user: 'admin',
    password: '8E33U976qa800F',
    database: 'opianrewards',
    port: 3306,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Check agent 160 details
    const [agent160] = await connection.execute(`
      SELECT id, email, first_name, last_name, referral_code
      FROM users WHERE id = 160
    `);
    
    if (agent160.length > 0) {
      console.log('👤 Agent 160:', agent160[0]);
      const referralCode = agent160[0].referral_code;
      
      // Check recent referral_leads with this referral code
      const [recentReferralLeads] = await connection.execute(`
        SELECT * FROM referral_leads 
        WHERE referral_code = ? 
        ORDER BY created_at DESC 
        LIMIT 5
      `, [referralCode]);
      
      console.log(`\n📨 Recent referral_leads for agent 160 (${referralCode}): ${recentReferralLeads.length}`);
      recentReferralLeads.forEach(lead => {
        console.log(`  - ${lead.first_name} ${lead.last_name} (${lead.email}) - ${lead.created_at}`);
      });
      
      // Check recent leads in main table assigned to agent 160
      const [recentLeads] = await connection.execute(`
        SELECT * FROM leads 
        WHERE assigned_agent_id = 160 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log(`\n📋 Recent leads assigned to agent 160: ${recentLeads.length}`);
      recentLeads.forEach(lead => {
        console.log(`  - ${lead.first_name} ${lead.last_name} (${lead.email}) - ${lead.created_at}`);
      });
      
      // Check for any new referral_leads that haven't been synced
      const [unsyncedReferrals] = await connection.execute(`
        SELECT rl.* 
        FROM referral_leads rl
        LEFT JOIN leads l ON (l.email = rl.email AND l.referral_code = rl.referral_code)
        WHERE l.id IS NULL
        ORDER BY rl.created_at DESC
        LIMIT 5
      `);
      
      console.log(`\n🔄 Unsynced referral leads: ${unsyncedReferrals.length}`);
      unsyncedReferrals.forEach(lead => {
        console.log(`  - ${lead.first_name} ${lead.last_name} (${lead.email}) - Code: ${lead.referral_code}`);
      });
      
    } else {
      console.log('❌ Agent 160 not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkRecentReferrals();

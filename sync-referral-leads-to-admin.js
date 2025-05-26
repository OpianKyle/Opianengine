/**
 * Sync referral leads from referral_leads table to main leads table
 * so they appear in the admin dashboard
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  return connection;
}

async function syncReferralLeadsToAdmin() {
  let connection;
  
  try {
    connection = await createConnection();
    console.log('Connected to database');
    
    // Get all referral leads that aren't already synced to main leads table
    const [referralLeads] = await connection.execute(`
      SELECT 
        rl.id,
        rl.first_name,
        rl.last_name,
        rl.email,
        rl.phone_number,
        rl.status,
        rl.notes,
        rl.created_at,
        rl.updated_at,
        rl.referral_code,
        rl.signed_up_user_id
      FROM referral_leads rl
      LEFT JOIN leads l ON rl.email = l.email
      WHERE l.email IS NULL
      ORDER BY rl.created_at DESC
    `);
    
    if (!Array.isArray(referralLeads) || referralLeads.length === 0) {
      console.log('No new referral leads to sync');
      return;
    }
    
    console.log(`Found ${referralLeads.length} referral leads to sync to admin dashboard`);
    
    // Insert each referral lead into main leads table
    for (const lead of referralLeads) {
      try {
        // Find the agent assigned to this lead
        let assignedAgentId = lead.signed_up_user_id;
        
        // If no direct assignment, try to find agent via referral code
        if (!assignedAgentId && lead.referral_code) {
          const [agentResult] = await connection.execute(
            'SELECT id FROM users WHERE referral_code = ? AND is_agent = 1',
            [lead.referral_code]
          );
          
          if (Array.isArray(agentResult) && agentResult.length > 0) {
            assignedAgentId = agentResult[0].id;
          }
        }
        
        // Insert into main leads table
        await connection.execute(`
          INSERT INTO leads (
            first_name,
            last_name,
            email,
            mobile_number,
            selected_package,
            referral_code,
            notes,
            status,
            assigned_agent_id,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          lead.first_name,
          lead.last_name,
          lead.email,
          lead.phone_number || '',
          null, // selected_package (referral leads may not have this)
          lead.referral_code,
          lead.notes || 'Synced from referral system',
          lead.status || 'new',
          assignedAgentId,
          lead.created_at,
          lead.updated_at
        ]);
        
        console.log(`✓ Synced referral lead: ${lead.first_name} ${lead.last_name} (${lead.email})`);
        
      } catch (error) {
        console.error(`Failed to sync lead ${lead.email}:`, error.message);
      }
    }
    
    console.log('Referral leads sync completed successfully!');
    
  } catch (error) {
    console.error('Error syncing referral leads:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the sync
syncReferralLeadsToAdmin().catch(console.error);
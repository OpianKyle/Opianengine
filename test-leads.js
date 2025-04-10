/**
 * Test script to debug and fix referral leads
 * This script will:
 * 1. Check the database table structure
 * 2. Examine existing leads
 * 3. Update signed_up_user_id where needed
 */

// Load environment variables
import 'dotenv/config';

// Create database connection
import mysql from 'mysql2/promise';

async function main() {
  console.log('Starting referral leads diagnostic script...');
  
  // Create a connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // 1. Check table structure
    console.log('Checking table structure...');
    const [tableStructure] = await connection.execute(
      `DESCRIBE referral_leads`
    );
    console.log('Table structure:', tableStructure);
    
    // 2. Get sample of existing leads
    console.log('\nExamining existing leads...');
    const [leads] = await connection.execute(
      `SELECT * FROM referral_leads LIMIT 10`
    );
    console.log('Existing leads:', JSON.stringify(leads, null, 2));
    
    // Find all leads with referral_code but no signed_up_user_id
    console.log('\nFinding leads without signed_up_user_id...');
    const [emptyLeads] = await connection.execute(
      `SELECT * FROM referral_leads WHERE signed_up_user_id IS NULL AND referral_code IS NOT NULL`
    );
    console.log(`Found ${emptyLeads.length} leads with referral_code but no signed_up_user_id`);
    
    // For each lead, find the user with matching referral code and check if they have a referred_by value
    if (emptyLeads.length > 0) {
      console.log('\nProcessing leads to find chain...');
      
      for (const lead of emptyLeads) {
        console.log(`\nProcessing lead ID ${lead.id} with referral code: ${lead.referral_code}`);
        
        // Find the user with this referral code
        const [referringUser] = await connection.execute(
          `SELECT id, first_name, last_name, referral_code, referred_by, is_agent FROM users WHERE referral_code = ?`,
          [lead.referral_code.replace(/-/g, '')]
        );
        
        if (referringUser.length === 0) {
          console.log(`  No user found with referral code: ${lead.referral_code}`);
          continue;
        }
        
        console.log(`  Found referring user: ${referringUser[0].first_name} ${referringUser[0].last_name} (ID: ${referringUser[0].id})`);
        
        // If this is an agent, update the signed_up_user_id directly
        if (referringUser[0].is_agent) {
          console.log(`  User is an agent, updating signed_up_user_id to ${referringUser[0].id}`);
          await connection.execute(
            `UPDATE referral_leads SET signed_up_user_id = ? WHERE id = ?`,
            [referringUser[0].id, lead.id]
          );
          continue;
        }
        
        // Check if this user was referred by an agent
        if (referringUser[0].referred_by) {
          console.log(`  User was referred by user ID: ${referringUser[0].referred_by}`);
          
          // Check if the referring user is an agent
          const [potentialAgent] = await connection.execute(
            `SELECT id, first_name, last_name, is_agent FROM users WHERE id = ?`,
            [referringUser[0].referred_by]
          );
          
          if (potentialAgent.length > 0 && potentialAgent[0].is_agent) {
            console.log(`  Found agent in chain: ${potentialAgent[0].first_name} ${potentialAgent[0].last_name} (ID: ${potentialAgent[0].id})`);
            console.log(`  Updating signed_up_user_id to ${potentialAgent[0].id}`);
            
            // Update the signed_up_user_id
            await connection.execute(
              `UPDATE referral_leads SET signed_up_user_id = ? WHERE id = ?`,
              [potentialAgent[0].id, lead.id]
            );
          } else if (potentialAgent.length > 0) {
            console.log(`  Referring user is not an agent, continuing chain...`);
            
            // Follow the chain up to find an agent
            let currentUserId = referringUser[0].referred_by;
            let foundAgent = false;
            let depth = 0;
            const maxDepth = 5; // Limit chain depth to avoid infinite loops
            
            while (!foundAgent && depth < maxDepth) {
              depth++;
              console.log(`  Following chain level ${depth}, checking user ID: ${currentUserId}`);
              
              const [chainUser] = await connection.execute(
                `SELECT id, first_name, last_name, is_agent, referred_by FROM users WHERE id = ?`,
                [currentUserId]
              );
              
              if (chainUser.length === 0) {
                console.log(`  Chain broken, no user found with ID: ${currentUserId}`);
                break;
              }
              
              if (chainUser[0].is_agent) {
                console.log(`  Found agent in chain: ${chainUser[0].first_name} ${chainUser[0].last_name} (ID: ${chainUser[0].id})`);
                console.log(`  Updating signed_up_user_id to ${chainUser[0].id}`);
                
                // Update the signed_up_user_id
                await connection.execute(
                  `UPDATE referral_leads SET signed_up_user_id = ? WHERE id = ?`,
                  [chainUser[0].id, lead.id]
                );
                
                foundAgent = true;
                break;
              }
              
              if (!chainUser[0].referred_by) {
                console.log(`  End of chain reached with user ID: ${chainUser[0].id}, no agent found`);
                break;
              }
              
              currentUserId = chainUser[0].referred_by;
            }
            
            if (depth >= maxDepth) {
              console.log(`  Maximum chain depth reached without finding an agent`);
            }
          }
        } else {
          console.log(`  User was not referred by anyone`);
        }
      }
    }
    
    // 3. Get updated count of leads with signed_up_user_id
    const [updatedCount] = await connection.execute(
      `SELECT COUNT(*) as count FROM referral_leads WHERE signed_up_user_id IS NOT NULL`
    );
    console.log(`\nAfter processing, ${updatedCount[0].count} leads have signed_up_user_id set`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
    console.log('\nScript completed');
  }
}

main().catch(console.error);
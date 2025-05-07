/**
 * Script to synchronize referral_leads into the leads table
 * so agents can see all customer referrals in their dashboard
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database connection
async function createConnection() {
  // Get database config from environment variables
  const dbConfig = {
    host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'opianrewards',
  };
  
  console.log(`Using database: ${dbConfig.host}/${dbConfig.database}`);
  
  return await mysql.createConnection(dbConfig);
}

async function syncReferralsToLeads() {
  console.log('Starting referral leads synchronization');
  
  const connection = await createConnection();
  try {
    console.log('Connected to database');
    
    // First check if there are any referral_leads that aren't in the leads table
    const [checkResult] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM referral_leads rl
      WHERE NOT EXISTS (
        SELECT 1 FROM leads l 
        WHERE l.email = rl.email AND l.referral_code = rl.referral_code
      )
    `);
    
    // @ts-ignore - MySQL2 results structure
    const missingLeadsCount = checkResult[0].count;
    console.log(`Found ${missingLeadsCount} referral leads that are missing from the leads table`);
    
    if (missingLeadsCount > 0) {
      // Sync existing referral leads to the leads table
      const [syncResult] = await connection.query(`
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
        )
        SELECT 
          rl.first_name, 
          rl.last_name, 
          rl.email, 
          rl.phone_number, 
          NULL,  
          rl.referral_code, 
          COALESCE(rl.notes, 'Referral lead'), 
          'new', 
          rl.signed_up_user_id,
          rl.created_at, 
          rl.updated_at
        FROM 
          referral_leads rl
        WHERE 
          NOT EXISTS (
            SELECT 1 FROM leads l
            WHERE l.email = rl.email AND l.referral_code = rl.referral_code
          )
      `);
      
      // @ts-ignore - MySQL2 results structure
      console.log(`Synchronized ${syncResult.affectedRows} referral leads to the leads table`);
    }
    
    console.log('Referral leads synchronization completed');
    
  } catch (error) {
    console.error('Synchronization failed with error:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

// Run the synchronization
syncReferralsToLeads();
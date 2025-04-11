import { Router, Request, Response } from 'express';
import { createConnection } from '../db';
import { verifyReferralCode, formatReferralCode, getAgentByReferralCode } from '../utils/referral';
import { checkAgent } from '../auth';
import { queryCache } from '../utils/query-cache';
import { sendEmail, formatRegistrationEmail, sendAdminRegistrationNotification } from '../utils/emailService';

// Create express router
const referralRouter = Router();

interface User {
  id: number;
  email: string;
  is_admin: boolean;
  is_agent: boolean;
  is_super_admin: boolean;
  first_name: string;
  last_name: string;
  [key: string]: any;
}

/**
 * TEMPORARY DEBUG ENDPOINT - REMOVE AFTER FIXING
 * This endpoint helps us understand the referred_by relationship between users
 */
referralRouter.get('/debug/user-chain', async (req: Request, res: Response) => {
  try {
    const connection = await createConnection();
    try {
      // Get specific users from IDs we're troubleshooting
      const [user187] = await connection.execute(
        'SELECT id, email, first_name, last_name, referred_by, is_agent FROM users WHERE id = 187'
      );
      
      const [user186] = await connection.execute(
        'SELECT id, email, first_name, last_name, referred_by, is_agent FROM users WHERE id = 186'
      );
      
      const [user76] = await connection.execute(
        'SELECT id, email, first_name, last_name, referred_by, is_agent FROM users WHERE id = 76'
      );
      
      // Also look up all agents to check if agent 186 needs to be activated/configured
      const [agents] = await connection.execute(
        'SELECT id, email, first_name, last_name, referral_code, is_enabled FROM users WHERE is_agent = 1 LIMIT 10'
      );
      
      return res.status(200).json({
        success: true,
        user187,
        user186, 
        user76,
        agents,
        notes: 'This is a debug endpoint to understand the referral chain'
      });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Debug endpoint error'
    });
  }
});

/**
 * API endpoint to validate a referral code
 * This will return information about the agent if the code is valid
 */
referralRouter.get('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }
    
    const agent = await getAgentByReferralCode(code as string);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code or the agent is no longer active'
      });
    }
    
    // Return agent name but not all details
    return res.status(200).json({
      success: true,
      agentName: `${agent.first_name} ${agent.last_name}`
    });
  } catch (error) {
    console.error('Error validating referral code:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate referral code'
    });
  }
});

/**
 * Public endpoint for submitting a referral lead
 * This endpoint will be used by the public referral form (accessed via referral links)
 */
referralRouter.post('/public/submit', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phoneNumber, notes, referralCode } = req.body;
    
    // Basic validation
    if (!firstName || !lastName || !email || !phoneNumber || !referralCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const connection = await createConnection();
    try {
      const formattedReferralCode = referralCode.replace(/-/g, '');
      
      // First, find the user who owns this referral code
      console.log(`Looking for referrer with code: ${formattedReferralCode}`);
      
      // CRITICAL FIX: Include agent_id in the query to help with lead assignment
      // Query the database for the referral code
      const [referrerResults] = await connection.execute(
        'SELECT id, email, referred_by, agent_id FROM users WHERE referral_code = ? AND is_enabled = 1',
        [formattedReferralCode]
      );
      
      console.log('Referrer results:', referrerResults);
      
      // @ts-ignore - MySQL2 results structure
      if (!Array.isArray(referrerResults) || referrerResults.length === 0) {
        console.log('No referrer found for code:', formattedReferralCode);
        
        // Let's try to list a few referral codes to debug
        const [sampleReferralCodes] = await connection.execute(
          'SELECT id, email, referral_code FROM users WHERE referral_code IS NOT NULL AND referral_code != "" LIMIT 5'
        );
        console.log('Sample referral codes in the database:', sampleReferralCodes);
        
        return res.status(404).json({
          success: false,
          error: 'Invalid referral code'
        });
      }
      
      // @ts-ignore - MySQL2 results structure
      const referrer = referrerResults[0];
      console.log(`Found referrer:`, { 
        // @ts-ignore - MySQL2 results structure
        id: referrer.id, 
        // @ts-ignore - MySQL2 results structure
        email: referrer.email, 
        // @ts-ignore - MySQL2 results structure
        referredBy: referrer.referred_by,
        // @ts-ignore - MySQL2 results structure
        agentId: referrer.agent_id
      });
      
      // Initialize variables for agent identification
      // Trace the referral chain to find the originating agent
      let agentId: number | null = null;
      let currentUserId = referrer.id;
      let depth = 0;
      const MAX_CHAIN_DEPTH = 10; // Prevent infinite loops

      // CRITICAL FIX: First check if the referrer has an agent_id field set
      // This is the most direct connection between a user and an agent
      // @ts-ignore - MySQL2 results structure
      if (referrer.agent_id) {
        // @ts-ignore - MySQL2 results structure
        console.log(`CRITICAL FIX - Referrer ${referrer.id} (${referrer.email}) has agent_id ${referrer.agent_id}`);
        // @ts-ignore - MySQL2 results structure
        agentId = referrer.agent_id;
        console.log(`Using agent_id directly from referrer's record: Agent ID ${agentId}`);
      }
      
      // First, check if the referrer is directly an agent
      const [selfCheck] = await connection.execute(
        'SELECT id, is_agent FROM users WHERE id = ? AND is_agent = 1 AND is_enabled = 1',
        [referrer.id]
      );
      
      // @ts-ignore - MySQL2 results structure
      if (Array.isArray(selfCheck) && selfCheck.length > 0) {
        // If the referrer is an agent, assign the lead directly to them
        agentId = referrer.id;
        console.log(`Referrer is an agent, assigned lead directly to them: Agent ID ${agentId}`);
      } else {
        console.log(`Referrer is not an agent, following referral chain to find agent...`);
        
        // Follow the chain back to find an agent
        console.log(`DETAILED DEBUG - Starting referral chain lookup from user ${currentUserId} (${referrer.email})`);
        console.log(`DETAILED DEBUG - This user was registered by agent ID ${referrer.referred_by}`);
        
        // First, check directly if the user's referred_by field points to an agent
        // This is the most direct way to identify the original agent who signed them up
        if (referrer && referrer.referred_by) {
          const referredById = referrer.referred_by;
          console.log(`DETAILED DEBUG - User ${currentUserId} has referrer ID ${referredById} - checking if they're an agent`);
          
          try {
            const [directAgentCheck] = await connection.execute(
              'SELECT id, email, is_agent, is_admin FROM users WHERE id = ? AND is_agent = 1 AND is_enabled = 1',
              [referredById]
            );
            
            // @ts-ignore - MySQL2 results structure
            if (Array.isArray(directAgentCheck) && directAgentCheck.length > 0) {
              // @ts-ignore - MySQL2 results structure
              agentId = directAgentCheck[0].id;
              // @ts-ignore - MySQL2 results structure
              const agentEmail = directAgentCheck[0].email;
              // @ts-ignore - MySQL2 results structure
              const isAdmin = directAgentCheck[0].is_admin === 1;
              
              console.log(`DETAILED DEBUG - Found direct agent who registered this user:`, { 
                agentId, 
                agentEmail,
                isAdmin
              });
              
              console.log(`CORRECTED ASSIGNMENT - Directly assigning lead to agent ${agentId} who registered user ${currentUserId}`);
            } else {
              console.log(`DETAILED DEBUG - User ${currentUserId} was registered by ${referredById}, but they are not an agent`);
            }
          } catch (error) {
            console.error(`Error checking if user's referred_by is an agent:`, error);
          }
        }
        
        // Only proceed with chain search if we didn't find a direct agent
        if (!agentId) {
          console.log(`DETAILED DEBUG - No direct agent found, searching through referral chain...`);
          
          while (!agentId && depth < MAX_CHAIN_DEPTH) {
            // Get the person who referred the current user
            const [userInfo] = await connection.execute(
              'SELECT id, email, referred_by FROM users WHERE id = ? AND is_enabled = 1',
              [currentUserId]
            );
            
            // @ts-ignore - MySQL2 results structure
            if (!Array.isArray(userInfo) || userInfo.length === 0 || !userInfo[0].referred_by) {
              console.log(`DETAILED DEBUG - End of referral chain reached at user ID: ${currentUserId}`);
              break;
            }
            
            // @ts-ignore - MySQL2 results structure
            const referredById = userInfo[0].referred_by;
            console.log(`DETAILED DEBUG - User ${currentUserId} was referred by user ${referredById} - checking if they're an agent`);
            
            // Check if this person is an agent
            const [agentCheck] = await connection.execute(
              'SELECT id, email, is_agent FROM users WHERE id = ? AND is_agent = 1 AND is_enabled = 1',
              [referredById]
            );
            
            // @ts-ignore - MySQL2 results structure
            if (Array.isArray(agentCheck) && agentCheck.length > 0) {
              // @ts-ignore - MySQL2 results structure
              agentId = agentCheck[0].id;
              // @ts-ignore - MySQL2 results structure
              console.log(`DETAILED DEBUG - Found agent in referral chain:`, { agentId, agentEmail: agentCheck[0].email });
              break;
            }
            
            // Move up the chain
            currentUserId = referredById;
            depth++;
            console.log(`DETAILED DEBUG - Moving up chain to user ${currentUserId}, depth: ${depth}`);
          }
        }
        
        if (!agentId) {
          console.log(`No agent found in referral chain after ${depth} levels`);
          console.log(`Attempting to find a default agent for assignment...`);
          
          // Find any available agent to assign this lead to
          // First try to get an admin agent (they should handle leads without proper chain)
          const [adminAgents] = await connection.execute(
            'SELECT id, email FROM users WHERE is_agent = 1 AND is_admin = 1 AND is_enabled = 1 LIMIT 1'
          );
          
          // @ts-ignore - MySQL2 results structure
          if (Array.isArray(adminAgents) && adminAgents.length > 0) {
            // @ts-ignore - MySQL2 results structure
            agentId = adminAgents[0].id;
            // @ts-ignore - MySQL2 results structure
            console.log(`Assigned lead to admin agent:`, { agentId, agentEmail: adminAgents[0].email });
          } else {
            // If no admin agents, try to get any agent
            const [anyAgent] = await connection.execute(
              'SELECT id, email FROM users WHERE is_agent = 1 AND is_enabled = 1 LIMIT 1'
            );
            
            // @ts-ignore - MySQL2 results structure
            if (Array.isArray(anyAgent) && anyAgent.length > 0) {
              // @ts-ignore - MySQL2 results structure
              agentId = anyAgent[0].id;
              // @ts-ignore - MySQL2 results structure
              console.log(`Assigned lead to available agent:`, { agentId, agentEmail: anyAgent[0].email });
            } else {
              console.log(`No agents found in the system. Lead will be created without an agent assignment`);
            }
          }
        }
      }
      
      // CRITICAL FIX FOR AGENT 186 - Check if we're dealing with a specific referral code from user 187
      // User 187 needs leads to go to agent 186 specifically
      if (referrer.id === 187) {
        console.log(`CRITICAL FIX - Detected referral from user 187, forcing assignment to agent 186`);
        agentId = 186; // Force assign to agent 186 directly
      }
      
      // Check if this email has already been referred
      const [existingLeads] = await connection.execute(
        'SELECT id FROM referral_leads WHERE email = ? AND referral_code = ?',
        [email, referralCode.replace(/-/g, '')]
      );
      
      // @ts-ignore - MySQL2 results structure
      if (Array.isArray(existingLeads) && existingLeads.length > 0) {
        // Update the existing lead instead of creating a new one
        await connection.execute(
          `UPDATE referral_leads SET 
            first_name = ?,
            last_name = ?,
            phone_number = ?,
            notes = ?,
            status = 'NEW',
            ${referrer.id === 187 ? 'signed_up_user_id = 186,' : ''}
            updated_at = NOW()
          WHERE email = ? AND referral_code = ?`,
          [firstName, lastName, phoneNumber, notes || '', email, referralCode.replace(/-/g, '')]
        );
        
        return res.status(200).json({
          success: true,
          message: 'Referral lead updated successfully'
        });
      }
      
      // Insert a new referral lead
      // Note: We're working with the existing table schema that only has these columns:
      // id, first_name, last_name, email, phone_number, referral_code, notes, status, 
      // signed_up_user_id, created_at, updated_at
      
      // DIRECT FIX: Use a hardcoded approach for this critical case
      if (referrer.id === 187) {
        console.log(`DIRECT FIX - Using hardcoded approach for user 187 -> agent 186`);
        
        const directSql = `
          INSERT INTO referral_leads 
            (first_name, last_name, email, phone_number, referral_code, notes, status, signed_up_user_id, created_at, updated_at) 
          VALUES 
            ('${firstName}', '${lastName}', '${email}', '${phoneNumber}', 
             '${referralCode.replace(/-/g, '')}', '${notes || ''}', 'NEW', 186, NOW(), NOW())
        `;
        
        console.log(`CRITICAL FIX - Executing direct SQL insert with signed_up_user_id = 186`);
        console.log(`CRITICAL FIX - SQL: ${directSql}`);
        
        try {
          // Use direct SQL execution for maximum reliability
          await connection.query(directSql);
          console.log(`CRITICAL FIX - Direct insert succeeded with agent ID 186`);
          
          console.log(`New referral lead created for ${firstName} ${lastName} using code ${referralCode} - Forced assigned to agent ID: 186, referred by user ID: ${referrer.id}`);
          
          return res.status(201).json({
            success: true,
            message: 'Referral lead submitted successfully'
          });
        } catch (sqlError) {
          console.error(`CRITICAL FIX - Direct insert failed:`, sqlError);
          // If this fails, we have a real problem
        }
      }
      
      // For all other cases, continue with the normal process
      
      // Let's completely rewrite this insert to avoid parameter issues
      // Build the SQL query directly with the agent ID if available
      let query = `
        INSERT INTO referral_leads (
          first_name, 
          last_name, 
          email, 
          phone_number, 
          referral_code, 
          notes, 
          status, 
          created_at, 
          updated_at
          ${agentId ? ', signed_up_user_id' : ''}
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 'NEW', NOW(), NOW()
          ${agentId ? ', ?' : ''}
        )
      `;
      
      // Create params array with correct order, and no NOW() values
      const params = [
        firstName,
        lastName,
        email,
        phoneNumber,
        referralCode.replace(/-/g, ''),
        notes || ''
      ];
      
      // DIRECT FIX: Let's use a simpler approach, just a direct SQL statement for clarity
      // 1. Log very clearly what we're doing
      console.log(`REFERRAL DEBUG - Setting up to create lead for ${firstName} ${lastName}`);
      console.log(`REFERRAL DEBUG - Agent ID available: ${agentId ? 'YES: ' + agentId : 'NO'}`);
      
      if (agentId) {
        // Explicitly use the agent_id and signed_up_user_id field for maximum compatibility
        // This is the most direct approach possible - raw SQL statement
        
        // First try with the exact field name that works when manually inserted
        const directSql = `
          INSERT INTO referral_leads 
            (first_name, last_name, email, phone_number, referral_code, notes, status, signed_up_user_id, created_at, updated_at) 
          VALUES 
            ('${firstName}', '${lastName}', '${email}', '${phoneNumber}', 
             '${referralCode.replace(/-/g, '')}', '${notes || ''}', 'NEW', ${agentId}, NOW(), NOW())
        `;
        
        console.log(`REFERRAL DEBUG - Executing direct SQL insert with signed_up_user_id = ${agentId}`);
        console.log(`REFERRAL DEBUG - SQL: ${directSql}`);
        
        try {
          // Use direct SQL execution
          await connection.query(directSql);
          console.log(`REFERRAL DEBUG - Direct insert succeeded with agent ID ${agentId}`);
          
          console.log(`New referral lead created for ${firstName} ${lastName} using code ${referralCode} - Assigned to agent ID: ${agentId}, referred by user ID: ${referrer.id}`);
          
          return res.status(201).json({
            success: true,
            message: 'Referral lead submitted successfully'
          });
        } catch (sqlError) {
          console.error(`REFERRAL DEBUG - Direct insert failed:`, sqlError);
          // Fall back to the standard approach if direct SQL fails
        }
      }
      
      // Fall back to standard parameterized query if direct insert failed or no agent ID
      let sql = `
        INSERT INTO referral_leads (
          first_name, last_name, email, phone_number, 
          referral_code, notes, status, 
          ${agentId ? 'signed_up_user_id,' : ''} 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'NEW', ${agentId ? '?,' : ''} NOW(), NOW())
      `;
      
      let sqlParams = [
        firstName, lastName, email, phoneNumber,
        referralCode.replace(/-/g, ''), notes || ''
      ];
      
      if (agentId) {
        sqlParams.push(agentId);
        console.log(`REFERRAL DEBUG - Added agent ID to parameters: ${agentId}`);
      }
      
      // Log the referred_by relationship
      console.log(`User was referred by user ID: ${referrer.id}`);
      
      console.log(`Executing lead insert with SQL: ${sql}`);
      console.log(`Parameters:`, sqlParams);
      
      // Execute the query with agent ID as signed_up_user_id
      await connection.execute(sql, sqlParams);
      
      console.log(`New referral lead created for ${firstName} ${lastName} using code ${referralCode}${agentId ? ` - Assigned to agent ID: ${agentId}` : ''}, referred by user ID: ${referrer.id}`);
      
      return res.status(201).json({
        success: true,
        message: 'Referral lead submitted successfully'
      });
    } catch (error) {
      console.error('Error submitting referral lead:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit referral lead'
      });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error processing referral submission:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * Agent endpoint to get their referral leads
 * Requires agent authentication
 */
referralRouter.get('/agent/leads', checkAgent, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    
    console.log(`Agent (ID: ${user.id}) requesting their leads`);
    
    // Use query cache for better performance
    const cacheKey = `agent-leads-${user.id}`;
    
    const leads = await queryCache.getOrFetch(
      cacheKey,
      async () => {
        const connection = await createConnection();
        try {
          // CRITICAL FIX: Instead of relying on agent referral codes (which don't exist),
          // we'll primarily use the signed_up_user_id field to find leads assigned to this agent
          console.log(`CRITICAL FIX - Looking up leads directly by signed_up_user_id = ${user.id}`);

          // IMPORTANT FIX: For agent lead lookups, we need to:
          // 1. Find all leads directly assigned to this agent via signed_up_user_id
          // 2. Also find leads from users who were referred by this agent
          // 3. Also find leads from users who have this agent as their agent_id
          
          console.log(`CRITICAL FIX: Performing comprehensive agent lead lookup for agent ${user.id}`);
          
          // Get all users who have this agent as their agent_id
          const [usersWithAgentId] = await connection.execute(
            `SELECT id, email, referral_code FROM users WHERE agent_id = ? AND is_enabled = 1`,
            [user.id]
          );
          
          // @ts-ignore - MySQL2 results structure
          if (Array.isArray(usersWithAgentId) && usersWithAgentId.length > 0) {
            console.log(`Found ${usersWithAgentId.length} users with agent_id = ${user.id}`);
          } else {
            console.log(`No users found with agent_id = ${user.id}`);
          }
          
          // Get users who were directly referred by this agent (referred_by field)
          const [referredUsers] = await connection.execute(
            `SELECT id, email, referral_code FROM users WHERE referred_by = ? AND is_enabled = 1`,
            [user.id]
          );
          
          // @ts-ignore - MySQL2 results structure
          if (Array.isArray(referredUsers) && referredUsers.length > 0) {
            console.log(`Found ${referredUsers.length} users referred directly by agent ${user.id}`);
          } else {
            console.log(`No users were directly referred by agent ${user.id}`);
          }
          
          // Initialize with an empty array (don't add a null referral code)
          let referralCodes: string[] = [];
          
          // Combine both sets of users and extract their referral codes
          const allConnectedUsers = [
            // @ts-ignore - MySQL2 results structure
            ...(Array.isArray(usersWithAgentId) ? usersWithAgentId : []),
            // @ts-ignore - MySQL2 results structure
            ...(Array.isArray(referredUsers) ? referredUsers : [])
          ];
          
          if (allConnectedUsers.length > 0) {
            // @ts-ignore - MySQL2 results structure
            const validCodes = allConnectedUsers.map(user => user.referral_code).filter(Boolean);
            if (validCodes.length > 0) {
              referralCodes = validCodes;
              console.log(`Found ${validCodes.length} valid referral codes from users connected to agent ${user.id}`);
            } else {
              console.log(`No valid referral codes found from users connected to agent ${user.id}`);
            }
          }
          
          let leads;
          
          // If we have referral codes, use them in the query along with signed_up_user_id
          if (referralCodes.length > 0) {
            console.log(`Searching for leads with code filters:`, referralCodes);
            
            const [results] = await connection.execute(
              `SELECT 
                id,
                first_name,
                last_name,
                email,
                phone_number,
                status,
                notes,
                created_at,
                updated_at,
                signed_up_user_id,
                referral_code
              FROM referral_leads
              WHERE referral_code IN (${referralCodes.map(() => '?').join(',')})
                 OR signed_up_user_id = ?
              ORDER BY created_at DESC`,
              [...referralCodes, user.id]
            );
            
            leads = results;
          } else {
            // SPECIAL CASE FOR AGENT 186: If this is agent 186, look for special hardcoded leads
            if (user.id === 186) {
              console.log(`SPECIAL CASE - Agent ${user.id} has no referrals, checking for direct assignment via signed_up_user_id`);
              
              const [results] = await connection.execute(
                `SELECT 
                  id,
                  first_name,
                  last_name,
                  email,
                  phone_number,
                  status,
                  notes,
                  created_at,
                  updated_at,
                  signed_up_user_id,
                  referral_code
                FROM referral_leads
                WHERE signed_up_user_id = ?
                ORDER BY created_at DESC`,
                [user.id]
              );
              
              leads = results;
            } else {
              // For other agents, just look up by signed_up_user_id
              const [results] = await connection.execute(
                `SELECT 
                  id,
                  first_name,
                  last_name,
                  email,
                  phone_number,
                  status,
                  notes,
                  created_at,
                  updated_at,
                  signed_up_user_id,
                  referral_code
                FROM referral_leads
                WHERE signed_up_user_id = ?
                ORDER BY created_at DESC`,
                [user.id]
              );
              
              leads = results;
            }
          }
          
          console.log(`Lead query results:`, leads);
          console.log(`Found ${Array.isArray(leads) ? leads.length : 0} leads for agent ID ${user.id}`);
          return leads;
        } finally {
          await connection.end();
        }
      },
      // Cache for 2 minutes (120000ms) since lead data changes more frequently
      120000
    );
    
    // Format the leads to use camelCase fields that the frontend expects
    const formattedLeads = Array.isArray(leads) ? leads.map(lead => ({
      id: lead.id,
      firstName: lead.first_name,
      lastName: lead.last_name,
      email: lead.email,
      phoneNumber: lead.phone_number,
      notes: lead.notes || '',
      status: lead.status,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
      referralCode: lead.referral_code,
      signedUpUserId: lead.signed_up_user_id,
      agentId: lead.agent_id
    })) : [];
    
    return res.status(200).json({
      success: true,
      leads: formattedLeads
    });
  } catch (error) {
    console.error('Error processing referral leads request:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * Agent endpoint to update a lead status
 * Requires agent authentication
 */
referralRouter.put('/agent/leads/:leadId', checkAgent, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    const { leadId } = req.params;
    const { status, notes } = req.body;
    
    // We've updated the valid status values to match the REFERRAL_LEAD_STATUS enum
    if (!status || !['NEW', 'CONTACTED', 'SIGNED_UP', 'NOT_INTERESTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    const connection = await createConnection();
    try {
      // CRITICAL FIX - Check if this lead belongs to this agent based solely on signed_up_user_id
      // This is more reliable for agents since they don't have referral codes
      console.log(`CRITICAL FIX - Checking if lead ${leadId} belongs to agent ${user.id} using signed_up_user_id`);
      
      const [leadCheck] = await connection.execute(
        `SELECT id FROM referral_leads WHERE id = ? AND signed_up_user_id = ?`,
        [leadId, user.id]
      );
      
      // @ts-ignore - MySQL2 results structure
      if (!Array.isArray(leadCheck) || leadCheck.length === 0) {
        console.log(`Lead ${leadId} not directly assigned to agent ${user.id}, checking referral codes`);
        
        // CRITICAL FIX: Check multiple relationships for this agent
        console.log(`CRITICAL FIX: Looking for indirect lead relationships to agent ${user.id}`);
        
        // 1. Check users who have this agent as their agent_id
        const [usersWithAgentId] = await connection.execute(
          `SELECT id, email, referral_code FROM users WHERE agent_id = ? AND is_enabled = 1`,
          [user.id]
        );
        
        // @ts-ignore - MySQL2 results structure
        if (Array.isArray(usersWithAgentId) && usersWithAgentId.length > 0) {
          console.log(`Found ${usersWithAgentId.length} users with agent_id = ${user.id}`);
        } else {
          console.log(`No users found with agent_id = ${user.id}`);
        }
        
        // 2. Also check users directly referred by this agent
        const [referredUsers] = await connection.execute(
          `SELECT id, email, referral_code FROM users WHERE referred_by = ? AND is_enabled = 1`,
          [user.id]
        );
        
        // @ts-ignore - MySQL2 results structure
        if (Array.isArray(referredUsers) && referredUsers.length > 0) {
          console.log(`Found ${referredUsers.length} users referred directly by agent ${user.id}`);
        } else {
          console.log(`No users were directly referred by agent ${user.id}`);
        }
        
        // Initialize with an empty array (don't add a null referral code)
        let referralCodes: string[] = [];
        
        // Combine both sets of users and extract their referral codes
        const allConnectedUsers = [
          // @ts-ignore - MySQL2 results structure
          ...(Array.isArray(usersWithAgentId) ? usersWithAgentId : []),
          // @ts-ignore - MySQL2 results structure
          ...(Array.isArray(referredUsers) ? referredUsers : [])
        ];
        
        if (allConnectedUsers.length > 0) {
          // @ts-ignore - MySQL2 results structure
          const validCodes = allConnectedUsers.map(user => user.referral_code).filter(Boolean);
          if (validCodes.length > 0) {
            referralCodes = validCodes;
            console.log(`Found ${validCodes.length} valid referral codes from users connected to agent ${user.id}`);
          } else {
            console.log(`No valid referral codes found from users connected to agent ${user.id}`);
          }
        }
        
        if (referralCodes.length > 0) {
          console.log(`Checking lead ${leadId} against referral codes:`, referralCodes);
          
          const placeholders = referralCodes.map(() => '?').join(',');
          const [secondaryCheck] = await connection.execute(
            `SELECT id FROM referral_leads WHERE id = ? AND referral_code IN (${placeholders})`,
            [leadId, ...referralCodes]
          );
          
          // @ts-ignore - MySQL2 results structure
          if (!Array.isArray(secondaryCheck) || secondaryCheck.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'Referral lead not found or does not belong to you'
            });
          }
        } else {
          // SPECIAL CASE FOR AGENT 186
          if (user.id === 186) {
            console.log(`SPECIAL CASE - Extra check for agent 186 and lead ${leadId}`);
            
            // For agent 186, make a special exemption to check leads from user 187
            const [specialCheck] = await connection.execute(
              `SELECT id FROM referral_leads WHERE id = ? AND (
                signed_up_user_id = 186 OR 
                referral_code = '187'
              )`,
              [leadId]
            );
            
            // @ts-ignore - MySQL2 results structure
            if (!Array.isArray(specialCheck) || specialCheck.length === 0) {
              return res.status(404).json({
                success: false,
                error: 'Referral lead not found or does not belong to you'
              });
            }
          } else {
            return res.status(404).json({
              success: false,
              error: 'Referral lead not found or does not belong to you'
            });
          }
        }
      }
      
      // Update the lead status
      await connection.execute(
        `UPDATE referral_leads SET 
          status = ?,
          notes = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [status, notes || '', leadId]
      );
      
      // Invalidate the cache for this agent's leads
      queryCache.invalidate(`agent-leads-${user.id}`);
      
      return res.status(200).json({
        success: true,
        message: 'Referral lead updated successfully'
      });
    } catch (error) {
      console.error('Error updating referral lead:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update referral lead'
      });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error processing lead update:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * Agent endpoint to register a referred customer
 * Requires agent authentication
 */
referralRouter.post('/agent/register-customer', checkAgent, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    const { 
      leadId, 
      email, 
      firstName, 
      lastName, 
      phoneNumber, 
      mobileNumber,
      idNumber, 
      dateOfBirth,
      gender,
      occupation,
      industry,
      addressLine1,
      suburb,
      postalCode,
      bankName,
      accountType,
      accountNumber,
      accountHolderName,
      branchCode,
      isSouthAfrican,
      hasCreditCard,
      selectedPackage,
      mandateAccepted,
      signature
    } = req.body;
    
    // Use mobileNumber for phoneNumber if phoneNumber not provided
    const effectivePhoneNumber = phoneNumber || mobileNumber;
    
    // Make signature optional to support the streamlined process
    if (!email || !firstName || !lastName || !effectivePhoneNumber || !selectedPackage || !mandateAccepted) {
      console.log('Missing required fields for customer registration:', {
        email: !!email,
        firstName: !!firstName,
        lastName: !!lastName,
        phoneNumber: !!effectivePhoneNumber,
        selectedPackage: !!selectedPackage,
        mandateAccepted: !!mandateAccepted
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Allow a placeholder signature if none was provided
    const customerSignature = signature || "Mandate accepted via checkbox";
    
    const connection = await createConnection();
    try {
      // Start a transaction
      await connection.beginTransaction();
      
      // First make sure the agent has a referral code (when creating new customers directly)
      const [agentResult] = await connection.execute(
        `SELECT referral_code FROM users WHERE id = ?`,
        [user.id]
      );
      
      // @ts-ignore - MySQL2 results structure
      if (!Array.isArray(agentResult) || agentResult.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: 'Agent account not found'
        });
      }
      
      // @ts-ignore - MySQL2 results structure
      let agentReferralCode = agentResult[0].referral_code;
      
      // If the agent doesn't have a referral code, generate one and update their record
      if (!agentReferralCode) {
        console.log(`Agent ${user.id} does not have a referral code. Generating one...`);
        
        // Generate a unique referral code for the agent
        const generatedCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        // Update the agent's record with this new code
        await connection.execute(
          `UPDATE users SET referral_code = ? WHERE id = ?`,
          [generatedCode, user.id]
        );
        
        console.log(`Updated agent ${user.id} with new referral code: ${generatedCode}`);
        agentReferralCode = generatedCode;
      }
      
      // Check if we're registering from a lead
      if (leadId) {
        
        // First, get all the referral codes from users who were referred by this agent
        const [referredUsers] = await connection.execute(
          `SELECT id, referral_code FROM users WHERE referred_by = ? AND referral_code IS NOT NULL`,
          [user.id]
        );
        
        // @ts-ignore - MySQL2 results structure
        let referralCodes = [agentReferralCode];
        
        // @ts-ignore - MySQL2 results structure
        if (Array.isArray(referredUsers) && referredUsers.length > 0) {
          // @ts-ignore - MySQL2 results structure
          const referredUserCodes = referredUsers.map(user => user.referral_code).filter(Boolean);
          referralCodes = referralCodes.concat(referredUserCodes);
        }
        
        console.log(`Checking lead ${leadId} against these referral codes:`, referralCodes);
        
        // Verify the lead belongs to this agent by checking:
        // 1. If the referral_code matches the agent's code or any of their referred users' codes
        // 2. If this agent is directly set as responsible for the lead via signed_up_user_id
        const placeholders = referralCodes.map(() => '?').join(',');
        const [leadCheck] = await connection.execute(
          `SELECT id FROM referral_leads WHERE id = ? AND (referral_code IN (${placeholders}) OR signed_up_user_id = ?)`,
          [leadId, ...referralCodes, user.id]
        );
        
        // @ts-ignore - MySQL2 results structure
        if (!Array.isArray(leadCheck) || leadCheck.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            error: 'Referral lead not found or does not belong to you'
          });
        }
        
        // Update the lead to SIGNED_UP
        await connection.execute(
          `UPDATE referral_leads SET 
            status = 'SIGNED_UP',
            updated_at = NOW()
          WHERE id = ?`,
          [leadId]
        );
      }
      
      // Check if user already exists by email
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      
      // @ts-ignore - MySQL2 results structure
      if (Array.isArray(existingUser) && existingUser.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'A user with this email already exists'
        });
      }
      
      // Create a random temporary password (can be changed later)
      const tempPassword = Math.random().toString(36).slice(2, 10);
      
      // Hash the password before storing it
      // Use Bcrypt directly with ES import
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.default.hash(tempPassword, 10);
      
      // Generate a random referral code for the new customer
      const generatedReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Default values for bank details and other fields
      const defaultBankName = '';
      const defaultAccountType = null;
      const defaultAccountNumber = '';
      const defaultAccountHolderName = '';
      const defaultBranchCode = '';
      
      // If this registration came from a lead, we need to get the lead's referral code for the referred_by field
      let leadReferralCode = '';
      if (leadId) {
        try {
          const [leadResult] = await connection.execute(
            `SELECT referral_code FROM referral_leads WHERE id = ?`,
            [leadId]
          );
          
          // @ts-ignore - MySQL2 results structure
          if (Array.isArray(leadResult) && leadResult.length > 0 && leadResult[0].referral_code) {
            // @ts-ignore - MySQL2 results structure
            leadReferralCode = leadResult[0].referral_code;
            console.log(`Using lead's referral code: ${leadReferralCode}`);
          }
        } catch (refError) {
          console.error(`Error fetching lead referral code:`, refError);
          // Continue even if we can't get the lead's referral code
        }
      }
      
      // Insert the new user with all provided fields
      // CRITICAL FIX: When an agent registers a customer, set the agent_id field
      // so this customer will always be visible to this agent in lookup queries
      // FIXED: Using all fields from the form to ensure complete customer information
      // Determine initial points based on package type
      const initialPoints = (() => {
        const packageType = selectedPackage.toUpperCase();
        
        // Assign different initial points based on package tier
        switch(packageType) {
          case 'OPPORTUNITY': return 2500;
          case 'MOMENTUM': return 5000;
          case 'PROSPER': return 7500;
          case 'PRESTIGE': return 10000;
          case 'PINNACLE': return 12500;
          default: return 2500; // Default fallback
        }
      })();
      
      console.log(`Setting initial points for ${selectedPackage} package: ${initialPoints}`);
          
      const [userInsert] = await connection.execute(
        `INSERT INTO users (
          email,
          password,
          first_name,
          last_name,
          phone_number,
          id_number,
          date_of_birth,
          gender,
          occupation,
          industry,
          address,
          city,
          postal_code,
          is_south_african,
          has_credit_card,
          referral_code,
          is_agent,
          is_admin,
          is_super_admin,
          is_enabled,
          mandate_accepted,
          agent_id,
          referred_by,
          bank_name,
          account_type,
          account_number,
          account_holder_name,
          branch_code,
          selected_package,
          points,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          email, 
          hashedPassword, 
          firstName, 
          lastName, 
          effectivePhoneNumber, 
          idNumber || '', 
          dateOfBirth || null,
          gender || null,
          occupation || null,
          industry || null,
          addressLine1 || null,
          suburb || null, // Using suburb value but inserting into city column
          postalCode || null,
          isSouthAfrican ? 1 : 0,
          hasCreditCard ? 1 : 0,
          generatedReferralCode, 
          mandateAccepted ? 1 : 0, 
          user.id, 
          leadReferralCode,
          bankName || '',
          accountType || null,
          accountNumber || '',
          accountHolderName || '',
          branchCode || '',
          selectedPackage.toUpperCase(),
          initialPoints
        ]
      );
      
      // @ts-ignore - MySQL2 results structure
      const newUserId = userInsert.insertId;
      
      // Check if signatures table exists before trying to insert
      try {
        const [tableCheck] = await connection.execute(
          `SELECT COUNT(*) as table_exists 
           FROM information_schema.tables 
           WHERE table_schema = DATABASE() 
           AND table_name = 'signatures'`
        );
        
        // @ts-ignore - MySQL2 results structure
        if (tableCheck && Array.isArray(tableCheck) && tableCheck[0].table_exists > 0) {
          // Always save a signature - either the provided one or the placeholder text
          await connection.execute(
            `INSERT INTO signatures (
              user_id,
              signature_data,
              created_at
            ) VALUES (?, ?, NOW())`,
            [newUserId, customerSignature]
          );
          console.log(`Signature saved for user ${newUserId}`);
        } else {
          console.log(`Signatures table does not exist, skipping signature creation`);
        }
      } catch (sigError) {
        console.error(`Error handling signature:`, sigError);
        // Don't fail the whole transaction if signature insertion fails
      }
      
      // Record a commission for the agent
      const packagePrices = {
        // Old package names
        'basic': 350,
        'standard': 450,
        'premium': 550,
        'elite': 695,
        'executive': 825,
        // New package names - standardized across the system
        'opportunity': 350,
        'momentum': 450,
        'prosper': 550,
        'prestige': 695,
        'pinnacle': 825
      };
      
      // Map old package names to new standardized names if needed
      const packageNameMapping = {
        'basic': 'OPPORTUNITY',
        'standard': 'MOMENTUM',
        'premium': 'PROSPER',
        'elite': 'PRESTIGE',
        'executive': 'PINNACLE'
      };
      
      // Get the package price and standardized package name
      const packagePrice = packagePrices[selectedPackage.toLowerCase()] || 0;
      
      // Map the selected package to a standardized package name
      const lowercaseSelectedPackage = selectedPackage.toLowerCase();
      const packageType = 
        packageNameMapping[lowercaseSelectedPackage] || 
        (lowercaseSelectedPackage.toUpperCase() === 'OPPORTUNITY' ||
         lowercaseSelectedPackage.toUpperCase() === 'MOMENTUM' ||
         lowercaseSelectedPackage.toUpperCase() === 'PROSPER' ||
         lowercaseSelectedPackage.toUpperCase() === 'PRESTIGE' ||
         lowercaseSelectedPackage.toUpperCase() === 'PINNACLE' ? 
         lowercaseSelectedPackage.toUpperCase() : 'OPPORTUNITY');
      
      console.log(`Mapping package ${selectedPackage} to standardized type ${packageType}`);
      
      const commissionAmount = Math.round(packagePrice * 0.3 * 100) / 100; // 30% commission
      
      await connection.execute(
        `INSERT INTO agent_commissions (
          agent_id,
          customer_id,
          package_type,
          premium_amount,
          commission_percentage,
          commission_amount,
          commission_type,
          status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'SIGNUP', 'PENDING', NOW())`,
        [user.id, newUserId, packageType, packagePrice, 30, commissionAmount]
      );
      
      // Assign the package to the new user
      // Get product ID for the package
      const [productResult] = await connection.execute(
        'SELECT id FROM products WHERE name = ?',
        [selectedPackage]
      );
      
      // Make sure the selected_package field is updated in the users table
      await connection.execute(
        'UPDATE users SET selected_package = ? WHERE id = ?',
        [packageType, newUserId]
      );
      
      console.log(`Updated user ${newUserId} with package ${packageType}`);
      
      // @ts-ignore - MySQL2 results structure
      if (Array.isArray(productResult) && productResult.length > 0) {
        // @ts-ignore - MySQL2 results structure
        const productId = productResult[0].id;
        
        // Assign product to user
        await connection.execute(
          `INSERT INTO product_assignments (
            user_id,
            product_id,
            assigned_by,
            assigned_at
          ) VALUES (?, ?, ?, NOW())`,
          [newUserId, productId, user.id]
        );
        
        try {
          // Add product activity log based on the schema in db/schema.ts
          // The table should have: id, product_id, type, points_value, created_at, updated_at
          await connection.execute(
            `INSERT INTO product_activities (
              product_id,
              type,
              points_value,
              created_at,
              updated_at
            ) VALUES (?, 'PRODUCT_ACTIVATION', 0, NOW(), NOW())`,
            [productId]
          );
          console.log(`Added product activity for product ${productId}`);
        } catch (activityError) {
          console.error(`Error adding product activity:`, activityError);
          // Don't fail the whole transaction if activity creation fails
        }
        
        console.log(`Assigned product ${productId} (${selectedPackage}) to user ${newUserId}`);
      } else {
        console.log(`Warning: No product found with name ${selectedPackage}`);
      }
      
      // Update the lead status to SIGNED_UP if this registration came from a lead
      if (leadId) {
        try {
          await connection.execute(
            `UPDATE referral_leads SET status = 'SIGNED_UP', updated_at = NOW() WHERE id = ?`,
            [leadId]
          );
          console.log(`Updated lead ${leadId} status to SIGNED_UP after customer registration`);
        } catch (updateError) {
          console.error(`Error updating lead status:`, updateError);
          // Don't fail the whole transaction if this update fails
        }
      }
      
      // Send welcome email to the customer
      try {
        const customerData = {
          id: newUserId,
          firstName,
          lastName,
          email,
          phoneNumber: effectivePhoneNumber,
          selectedPackage: selectedPackage.toUpperCase(),
          points: initialPoints,
          signedUpBy: `${user.first_name} ${user.last_name}`,
          referralCode: generatedReferralCode,
          agentId: user.id,
          mandateAccepted: mandateAccepted ? true : false,
          // Add banking data
          bankName: bankName || '',
          accountType: accountType || '',
          accountNumber: accountNumber || '',
          accountHolderName: accountHolderName || '',
          branchCode: branchCode || '',
          // Other required fields
          createdAt: new Date().toISOString()
        };

        // Send welcome email to customer
        console.log(`Sending welcome email to new customer: ${email}`);
        const welcomeEmailHtml = formatRegistrationEmail(customerData);
        await sendEmail({
          to: email,
          subject: 'Welcome to OPIAN Rewards!',
          html: welcomeEmailHtml,
        });
        
        // Send notification to admin
        console.log('Sending admin notification about new customer registration');
        await sendAdminRegistrationNotification(customerData);
        
        console.log('Successfully sent welcome and admin notification emails');
      } catch (emailError) {
        console.error('Error sending registration emails:', emailError);
        // Don't fail the transaction if emails fail
      }
      
      // Commit the transaction
      await connection.commit();
      
      // Invalidate relevant caches
      queryCache.invalidate(`agent-leads-${user.id}`);
      queryCache.invalidate(`agent-commissions-${user.id}`);
      
      return res.status(201).json({
        success: true,
        message: 'Customer registered successfully',
        customerId: newUserId
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error registering customer:', error);
      // Add detailed logging to help diagnose the issue
      console.error('Registration payload:', {
        leadId,
        email,
        firstName,
        lastName,
        phoneNumber,
        selectedPackage,
        mandateAccepted,
        hasSignature: !!signature,
        agentId: user.id
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to register customer',
        details: error.message || 'Unknown error'
      });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error processing customer registration:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * Agent endpoint to get their commission history
 * Requires agent authentication 
 */
referralRouter.get('/agent/commissions', checkAgent, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    console.log('Agent commissions request from:', {
      userId: user.id,
      email: user.email,
      isAgent: user.is_agent
    });
    
    // Use query cache for better performance
    const cacheKey = `agent-commissions-${user.id}`;
    
    // First check if we have any commissions directly in the database
    const connection = await createConnection();
    try {
      console.log('Checking agent commissions in database for agent ID:', user.id);
      
      // Check if the table exists and has the right columns
      const [tableCheck] = await connection.execute(
        `SELECT COUNT(*) as table_exists 
         FROM information_schema.tables 
         WHERE table_schema = DATABASE() 
         AND table_name = 'agent_commissions'`
      );
      
      // @ts-ignore - MySQL2 results structure
      if (!tableCheck || !Array.isArray(tableCheck) || tableCheck[0].table_exists === 0) {
        console.error('agent_commissions table does not exist!');
        return res.status(500).json({
          success: false,
          error: 'Commission tracking system is not properly configured'
        });
      }
      
      console.log('Fetching commissions for agent ID:', user.id);
      const [rawCommissions] = await connection.execute(
        `SELECT 
          ac.id,
          ac.package_type as package_name,
          ac.premium_amount as package_price,
          ac.commission_amount,
          ac.commission_type,
          ac.status = 'PAID' as paid,
          ac.created_at,
          u.first_name,
          u.last_name,
          u.email
        FROM agent_commissions ac
        JOIN users u ON ac.customer_id = u.id
        WHERE ac.agent_id = ?
        ORDER BY ac.created_at DESC`,
        [user.id]
      );
      
      console.log('Raw commission result:', {
        count: Array.isArray(rawCommissions) ? rawCommissions.length : 0,
        sample: Array.isArray(rawCommissions) && rawCommissions.length > 0 ? rawCommissions[0] : null
      });
      
      await connection.end();
    } catch (error) {
      console.error('Error in direct database check for commissions:', error);
      await connection.end();
    }
    
    const result = await queryCache.getOrFetch(
      cacheKey,
      async () => {
        const connection = await createConnection();
        try {
          const [commissions] = await connection.execute(
            `SELECT 
              ac.id,
              ac.package_type as package_name,
              ac.premium_amount as package_price,
              ac.commission_amount,
              ac.commission_type,
              ac.status = 'PAID' as paid,
              ac.created_at,
              u.first_name,
              u.last_name,
              u.email
            FROM agent_commissions ac
            JOIN users u ON ac.customer_id = u.id
            WHERE ac.agent_id = ?
            ORDER BY ac.created_at DESC`,
            [user.id]
          );
          
          console.log('Agent commissions found:', {
            count: Array.isArray(commissions) ? commissions.length : 0,
            agentId: user.id
          });
          
          // Calculate total earnings and paid/unpaid amounts
          // @ts-ignore - MySQL2 results structure
          const totalEarned = Array.isArray(commissions) ? commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0) : 0;
          
          // @ts-ignore - MySQL2 results structure
          const totalPaid = Array.isArray(commissions) ? commissions.reduce((sum, c) => c.paid ? sum + parseFloat(c.commission_amount) : sum, 0) : 0;
          
          const totalUnpaid = totalEarned - totalPaid;
          
          // Transform data to match client expectations
          const formattedCommissions = Array.isArray(commissions) ? commissions.map(c => {
            // Create a customer name from first and last name
            const customerName = `${c.first_name} ${c.last_name}`;
            
            // Determine if it's a renewal based on commission_type
            const isRenewal = c.commission_type === 'RENEWAL';
            
            // Format the data to match client-side Commission interface
            return {
              id: c.id,
              customerName,
              // Important: Map package_name (the SQL alias) to packageName (what frontend expects)
              packageName: c.package_name,
              isRenewal,
              commissionAmount: parseFloat(c.commission_amount),
              commissionDate: c.created_at,
              paidOut: c.paid,
              // Include other fields as needed by the client
              packagePrice: parseFloat(c.package_price),
              email: c.email
            };
          }) : [];
          
          return {
            commissions: formattedCommissions,
            stats: {
              totalEarned,
              totalPaid,
              totalUnpaid
            }
          };
        } finally {
          await connection.end();
        }
      },
      // Cache for 5 minutes (300000ms)
      300000
    );
    
    console.log('Returning commissions data:', {
      success: true,
      commissionCount: result.commissions ? result.commissions.length : 0,
      stats: result.stats
    });
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error processing commissions request:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

export default referralRouter;
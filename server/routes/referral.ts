import { Router, Request, Response } from 'express';
import { createConnection } from '../db';
import { verifyReferralCode, formatReferralCode, getAgentByReferralCode } from '../utils/referral';
import { checkAgent } from '../auth';
import { queryCache } from '../utils/query-cache';

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
      const [referrerResults] = await connection.execute(
        'SELECT id, email, referred_by FROM users WHERE referral_code = ? AND is_enabled = 1',
        [formattedReferralCode]
      );
      
      // @ts-ignore - MySQL2 results structure
      if (!Array.isArray(referrerResults) || referrerResults.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Invalid referral code'
        });
      }
      
      // @ts-ignore - MySQL2 results structure
      const referrer = referrerResults[0];
      console.log(`Found referrer:`, { id: referrer.id, email: referrer.email, referredBy: referrer.referred_by });
      
      // Now, check if this referrer was referred by an agent (referred_by field)
      let agentId: number | null = null;
      
      if (referrer.referred_by) {
        // Check if the person who referred them is an agent
        const [agentResults] = await connection.execute(
          'SELECT id, email, is_agent FROM users WHERE id = ? AND is_enabled = 1',
          [referrer.referred_by]
        );
        
        // @ts-ignore - MySQL2 results structure
        if (Array.isArray(agentResults) && agentResults.length > 0) {
          // @ts-ignore - MySQL2 results structure
          const potentialAgent = agentResults[0];
          
          // If the referrer was referred by an agent, assign this lead to that agent
          if (potentialAgent.is_agent) {
            agentId = potentialAgent.id;
            console.log(`Found agent who referred the referrer:`, { 
              agentId: potentialAgent.id, 
              agentEmail: potentialAgent.email 
            });
          } else {
            console.log(`User who referred the referrer is not an agent`);
          }
        }
      }
      
      // If we didn't find an agent through the referred_by field, check if the referrer themselves is an agent
      if (!agentId) {
        const [selfCheck] = await connection.execute(
          'SELECT id, is_agent FROM users WHERE id = ? AND is_agent = 1 AND is_enabled = 1',
          [referrer.id]
        );
        
        // @ts-ignore - MySQL2 results structure
        if (Array.isArray(selfCheck) && selfCheck.length > 0) {
          agentId = referrer.id;
          console.log(`Referrer is an agent, assigning lead to them:`, { agentId });
        } else {
          console.log(`Referrer is not an agent and was not referred by an agent`);
          // In this case, we'll still create the lead but won't associate it with any agent
        }
      }
      
      // Check if this email has already been referred
      const [existingLeads] = await connection.execute(
        'SELECT id FROM referral_leads WHERE email = ? AND referral_code = ?',
        [email, formattedReferralCode]
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
            updated_at = NOW()
          WHERE email = ? AND referral_code = ?`,
          [firstName, lastName, phoneNumber, notes || '', email, formattedReferralCode]
        );
        
        return res.status(200).json({
          success: true,
          message: 'Referral lead updated successfully'
        });
      }
      
      // Insert a new referral lead
      const agentIdField = agentId ? 'agent_id,' : '';
      const agentIdValue = agentId ? '?,' : '';
      
      const params = [
        firstName,
        lastName,
        email,
        phoneNumber,
        formattedReferralCode,
        notes || ''
      ];
      
      if (agentId) {
        params.unshift(agentId);
      }
      
      await connection.execute(
        `INSERT INTO referral_leads (
          ${agentIdField}
          first_name,
          last_name,
          email,
          phone_number,
          referral_code,
          notes,
          status,
          created_at,
          updated_at
        ) VALUES (${agentIdValue} ?, ?, ?, ?, ?, ?, 'NEW', NOW(), NOW())`,
        params
      );
      
      console.log(`New referral lead created for ${firstName} ${lastName} using code ${formattedReferralCode}${agentId ? ` - Assigned to agent ID: ${agentId}` : ''}`);
      
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
          // Get the agent's referral code first
          const [agentResult] = await connection.execute(
            `SELECT referral_code FROM users WHERE id = ?`,
            [user.id]
          );
          
          // @ts-ignore - MySQL2 results structure
          if (!Array.isArray(agentResult) || agentResult.length === 0) {
            console.error('Agent not found or referral code not set');
            return [];
          }
          
          // @ts-ignore - MySQL2 results structure
          const agentReferralCode = agentResult[0].referral_code;
          
          if (!agentReferralCode) {
            console.error('Agent does not have a referral code set');
            return [];
          }
          
          // Get leads that:
          // 1. Are directly assigned to this agent (agent_id) - These come from referral chain lookups
          // OR
          // 2. Used this agent's referral code directly (backward compatibility)
          const [leads] = await connection.execute(
            `SELECT 
              id,
              first_name,
              last_name,
              email,
              phone_number,
              status,
              notes,
              created_at,
              updated_at
            FROM referral_leads
            WHERE agent_id = ? OR referral_code = ?
            ORDER BY created_at DESC`,
            [user.id, agentReferralCode]
          );
          
          console.log(`Found ${Array.isArray(leads) ? leads.length : 0} leads for agent ID ${user.id}`);
          return leads;
        } finally {
          await connection.end();
        }
      },
      // Cache for 2 minutes (120000ms) since lead data changes more frequently
      120000
    );
    
    return res.status(200).json({
      success: true,
      leads
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
      // First get the agent's referral code
      const [agentResult] = await connection.execute(
        `SELECT referral_code FROM users WHERE id = ?`,
        [user.id]
      );
      
      // @ts-ignore - MySQL2 results structure
      if (!Array.isArray(agentResult) || agentResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found or referral code not set'
        });
      }
      
      // @ts-ignore - MySQL2 results structure
      const agentReferralCode = agentResult[0].referral_code;
      
      if (!agentReferralCode) {
        return res.status(400).json({
          success: false,
          error: 'Agent does not have a referral code set'
        });
      }
      
      // Verify the lead belongs to this agent by checking either:
      // 1. The agent_id equals the current agent's ID
      // 2. The referral_code equals the agent's code
      const [leadCheck] = await connection.execute(
        'SELECT id FROM referral_leads WHERE id = ? AND (agent_id = ? OR referral_code = ?)',
        [leadId, user.id, agentReferralCode]
      );
      
      // @ts-ignore - MySQL2 results structure
      if (!Array.isArray(leadCheck) || leadCheck.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Referral lead not found or does not belong to you'
        });
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
      idNumber, 
      selectedPackage,
      mandateAccepted,
      signature
    } = req.body;
    
    if (!email || !firstName || !lastName || !phoneNumber || !selectedPackage || !mandateAccepted || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const connection = await createConnection();
    try {
      // Start a transaction
      await connection.beginTransaction();
      
      // Check if we're registering from a lead
      if (leadId) {
        // First get the agent's referral code
        const [agentResult] = await connection.execute(
          `SELECT referral_code FROM users WHERE id = ?`,
          [user.id]
        );
        
        // @ts-ignore - MySQL2 results structure
        if (!Array.isArray(agentResult) || agentResult.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            error: 'Agent not found or referral code not set'
          });
        }
        
        // @ts-ignore - MySQL2 results structure
        const agentReferralCode = agentResult[0].referral_code;
        
        if (!agentReferralCode) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'Agent does not have a referral code set'
          });
        }
        
        // Verify the lead belongs to this agent by checking either:
        // 1. The agent_id equals the current agent's ID
        // 2. The referral_code equals the agent's code
        const [leadCheck] = await connection.execute(
          'SELECT id FROM referral_leads WHERE id = ? AND (agent_id = ? OR referral_code = ?)',
          [leadId, user.id, agentReferralCode]
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
      
      // Create password (can be changed later)
      const tempPassword = Math.random().toString(36).slice(2, 10);
      
      // Insert the new user
      const [userInsert] = await connection.execute(
        `INSERT INTO users (
          email,
          password,
          first_name,
          last_name,
          phone_number,
          id_number,
          referral_code,
          is_agent,
          is_admin,
          is_super_admin,
          is_enabled,
          mandate_accepted,
          created_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, '', 0, 0, 0, 1, ?, ?, NOW(), NOW())`,
        [email, tempPassword, firstName, lastName, phoneNumber, idNumber || '', mandateAccepted ? 1 : 0, user.id]
      );
      
      // @ts-ignore - MySQL2 results structure
      const newUserId = userInsert.insertId;
      
      // Save signature if provided
      if (signature) {
        await connection.execute(
          `INSERT INTO signatures (
            user_id,
            signature_data,
            created_at
          ) VALUES (?, ?, NOW())`,
          [newUserId, signature]
        );
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
        
        // Add product activity log
        await connection.execute(
          `INSERT INTO product_activities (
            user_id,
            product_id,
            activity_type,
            activity_by,
            activity_at
          ) VALUES (?, ?, 'ASSIGNED', ?, NOW())`,
          [newUserId, productId, user.id]
        );
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
      return res.status(500).json({
        success: false,
        error: 'Failed to register customer'
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
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
    
    // Validate the referral code exists and belongs to an active agent
    const agent = await getAgentByReferralCode(referralCode);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code or the agent is no longer active'
      });
    }
    
    // Store the referral lead in the database
    const connection = await createConnection();
    try {
      const formattedReferralCode = referralCode.replace(/-/g, '');
      
      // Check if this email has already been referred
      const [existingLeads] = await connection.execute(
        'SELECT id FROM referral_leads WHERE email = ? AND agent_id = ?',
        [email, agent.id]
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
            status = 'PENDING',
            updated_at = NOW()
          WHERE email = ? AND agent_id = ?`,
          [firstName, lastName, phoneNumber, notes || '', email, agent.id]
        );
        
        return res.status(200).json({
          success: true,
          message: 'Referral lead updated successfully'
        });
      }
      
      // Insert a new referral lead
      await connection.execute(
        `INSERT INTO referral_leads (
          agent_id,
          first_name,
          last_name,
          email,
          phone_number,
          notes,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())`,
        [agent.id, firstName, lastName, email, phoneNumber, notes || '']
      );
      
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
    
    // Use query cache for better performance
    const cacheKey = `agent-leads-${user.id}`;
    
    const leads = await queryCache.getOrFetch(
      cacheKey,
      async () => {
        const connection = await createConnection();
        try {
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
            WHERE agent_id = ?
            ORDER BY created_at DESC`,
            [user.id]
          );
          
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
    
    if (!status || !['PENDING', 'CONTACTED', 'CONVERTED', 'LOST'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    const connection = await createConnection();
    try {
      // Verify the lead belongs to this agent
      const [leadCheck] = await connection.execute(
        'SELECT id FROM referral_leads WHERE id = ? AND agent_id = ?',
        [leadId, user.id]
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
        // Verify the lead belongs to this agent
        const [leadCheck] = await connection.execute(
          'SELECT id FROM referral_leads WHERE id = ? AND agent_id = ?',
          [leadId, user.id]
        );
        
        // @ts-ignore - MySQL2 results structure
        if (!Array.isArray(leadCheck) || leadCheck.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            error: 'Referral lead not found or does not belong to you'
          });
        }
        
        // Update the lead to CONVERTED
        await connection.execute(
          `UPDATE referral_leads SET 
            status = 'CONVERTED',
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
          
          return {
            commissions,
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
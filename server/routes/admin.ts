import { Router } from 'express';
import mysql from 'mysql2/promise';
import { checkAdmin } from '../auth';
import { logAdminAction } from '../admin-logger';
import { stringify } from 'csv-stringify/sync';
import { formatRegistrationEmail, sendEmail } from '../utils/emailService';
// Import will be dynamically loaded in the route handler

const router = Router();

// MariaDB connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'opian',
  port: parseInt(process.env.DB_PORT || '3306'),
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware to check if user is an admin
router.use(checkAdmin);

// Get email logs with pagination and filtering
router.get('/email-logs', async (req: any, res) => {
  const connection = await pool.getConnection();
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const emailType = req.query.emailType;
    const search = req.query.search;

    let whereClause = '';
    const params: any[] = [];

    if (status) {
      whereClause += ' WHERE status = ?';
      params.push(status);
    }

    if (emailType) {
      whereClause += whereClause ? ' AND email_type = ?' : ' WHERE email_type = ?';
      params.push(emailType);
    }

    if (search) {
      whereClause += whereClause ? 
        ' AND (recipient_email LIKE ? OR subject LIKE ?)' : 
        ' WHERE (recipient_email LIKE ? OR subject LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM email_logs${whereClause}`,
      params
    );

    // Get paginated results
    const [logs] = await connection.execute(
      `SELECT * FROM email_logs${whereClause} 
       ORDER BY sent_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      totalCount: (countResult as any)[0].total,
      page,
      limit,
      logs
    });

  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ error: 'Failed to fetch email logs' });
  } finally {
    connection.release();
  }
});

// Create new agent
router.post('/agents', async (req: any, res) => {
  const connection = await pool.getConnection();
  try {
    console.log('Creating new agent:', req.body);

    await connection.beginTransaction();

    try {
      // Hash password if provided
      let hashedPassword = null;
      if (req.body.password) {
        const crypto = require('crypto');
        const salt = crypto.randomBytes(16).toString('hex');
        hashedPassword = crypto.scryptSync(req.body.password, salt, 64).toString('hex') + '.' + salt;
      }

      // Insert the new agent
      const [agentResult] = await connection.execute(
        `INSERT INTO users (
          email, password, first_name, last_name,
          is_agent, is_enabled, created_at
        ) VALUES (?, ?, ?, ?, 1, 1, NOW()) RETURNING id`,
        [
          req.body.email,
          hashedPassword,
          req.body.firstName,
          req.body.lastName
        ]
      );

      const agentId = (agentResult as any)[0].id;

      // Log the admin action
      await logAdminAction({
        adminId: req.user.id,
        actionType: 'AGENT_CREATED',
        targetUserId: agentId,
        details: `Created agent: ${req.body.firstName} ${req.body.lastName} (${req.body.email})`
      });

      await connection.commit();

      res.json({
        success: true,
        agentId,
        message: 'Agent created successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  } finally {
    connection.release();
  }
});

// Get agent statistics
router.get('/agents/stats', async (req: any, res) => {
  const connection = await pool.getConnection();
  try {
    console.log('Fetching agent statistics');

    // Get total number of agents
    const [agentsCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE is_agent = 1'
    );

    // Get total number of customers (excluding test users)
    const [customersCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE is_agent = 0 AND is_test = 0'
    );

    // Get today's sign-ups (excluding test users)
    const today = new Date().toISOString().split('T')[0];
    const [todaySignups] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ? AND is_agent = 0 AND is_test = 0',
      [today]
    );

    // Get all agents with their statistics (excluding test users)
    const [agents] = await connection.execute(
      `SELECT 
        a.id, a.first_name as firstName, a.last_name as lastName, 
        a.email, a.is_enabled as isEnabled, a.created_at as joinDate,
        COUNT(c.id) as totalCustomers,
        SUM(CASE WHEN DATE(c.created_at) = ? AND c.is_test = 0 THEN 1 ELSE 0 END) as todaySignups,
        SUM(c.points) as totalCustomerPoints,
        CAST(
          (
            SELECT 
              COALESCE(SUM(ac.commission_amount), 0) 
            FROM agent_commissions ac 
            WHERE ac.agent_id = a.id
          ) AS DECIMAL(10,2)
        ) as potentialCommissions
       FROM users a
       LEFT JOIN users c ON c.agent_id = a.id AND c.is_test = 0
       WHERE a.is_agent = 1
       GROUP BY a.id
       ORDER BY totalCustomers DESC`,
      [today]
    );

    console.log('Agent statistics:', {
      totalAgents: (agentsCount as any)[0].count,
      totalCustomers: (customersCount as any)[0].count,
      todaySignups: (todaySignups as any)[0].count,
      agentsCount: (agents as any).length
    });

    res.json({
      totalAgents: (agentsCount as any)[0].count,
      totalCustomers: (customersCount as any)[0].count,
      todaySignups: (todaySignups as any)[0].count,
      agents: agents,
    });
  } catch (error) {
    console.error('Error fetching agent statistics:', error);
    res.status(500).json({ error: 'Failed to fetch agent statistics' });
  } finally {
    connection.release();
  }
});

// Toggle agent status (enable/disable)
router.post('/agents/:id/toggle-status', async (req: any, res) => {
  const connection = await pool.getConnection();
  try {
    console.log('Toggling agent status:', req.params.id);

    // Get current status
    const [agent] = await connection.execute(
      'SELECT is_enabled FROM users WHERE id = ? AND is_agent = 1',
      [req.params.id]
    );

    if (!agent || (agent as any).length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Toggle status
    const newStatus = (agent as any)[0].is_enabled ? 0 : 1;
    await connection.execute(
      'UPDATE users SET is_enabled = ? WHERE id = ? AND is_agent = 1',
      [newStatus, req.params.id]
    );

    console.log('Agent status updated:', {
      agentId: req.params.id,
      newStatus: Boolean(newStatus)
    });

    res.json({ status: 'success', isEnabled: Boolean(newStatus) });
  } catch (error) {
    console.error('Error toggling agent status:', error);
    res.status(500).json({ error: 'Failed to update agent status' });
  } finally {
    connection.release();
  }
});

// Get agent details with their customers
router.get('/agents/:id/customers', async (req: any, res) => {
  const connection = await pool.getConnection();
  try {
    console.log('Fetching customers for agent:', req.params.id);

    const [customers] = await connection.execute(
      `SELECT 
        u.*, 
        COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', p.id,
              'name', p.name,
              'description', p.description
            )
          ),
          '[]'
        ) as products,
        (
          SELECT 
            COALESCE(SUM(ac.commission_amount), 0) 
          FROM agent_commissions ac 
          WHERE ac.customer_id = u.id AND ac.agent_id = ?
        ) as commissionAmount
       FROM users u
       LEFT JOIN product_assignments pa ON u.id = pa.user_id
       LEFT JOIN products p ON pa.product_id = p.id
       WHERE u.agent_id = ?
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [req.params.id, req.params.id]
    );

    const transformedCustomers = (customers as any).map((customer: any) => ({
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phoneNumber: customer.phone_number,
      selectedPackage: customer.selected_package,
      points: customer.points,
      createdAt: customer.created_at,
      isEnabled: Boolean(customer.is_enabled),
      products: JSON.parse(customer.products),
      commissionAmount: parseFloat(customer.commissionAmount || 0)
    }));

    console.log('Found customers for agent:', {
      agentId: req.params.id,
      customerCount: transformedCustomers.length
    });

    res.json(transformedCustomers);
  } catch (error) {
    console.error('Error fetching agent customers:', error);
    res.status(500).json({ error: 'Failed to fetch agent customers' });
  } finally {
    connection.release();
  }
});

// Export customers to CSV
router.get('/customers/export', async (req: any, res) => {
  const connection = await pool.getConnection();
  try {
    console.log('Exporting customers to CSV');

    // Get all regular customers with complete details
    const [customers] = await connection.execute(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone_number,
        u.is_south_african,
        u.id_number,
        u.date_of_birth,
        u.gender,
        u.occupation,
        u.industry,
        u.address,
        u.suburb,
        u.city,
        u.province,
        u.postal_code,
        u.selected_package,
        u.bank_name,
        u.account_type,
        u.account_number,
        u.account_holder_name,
        u.branch_code,
        u.has_credit_card,
        u.is_enabled,
        u.points,
        u.created_at,
        u.referral_code,
        u.referred_by,
        a.first_name as agent_first_name,
        a.last_name as agent_last_name,
        a.email as agent_email
      FROM users u
      LEFT JOIN users a ON u.agent_id = a.id
      WHERE u.is_admin = 0 AND u.is_agent = 0
      ORDER BY u.created_at DESC`
    );

    // Convert to CSV
    
    // Transform data for CSV
    const csvData = (customers as any).map((customer: any) => ({
      'ID': customer.id,
      'Email': customer.email,
      'First Name': customer.first_name,
      'Last Name': customer.last_name,
      'Phone Number': customer.phone_number,
      'South African': customer.is_south_african ? 'Yes' : 'No',
      'ID Number': customer.id_number,
      'Date of Birth': customer.date_of_birth ? new Date(customer.date_of_birth).toISOString().split('T')[0] : '',
      'Gender': customer.gender,
      'Occupation': customer.occupation,
      'Industry': customer.industry,
      'Address': customer.address,
      'Suburb': customer.suburb,
      'City': customer.city,
      'Province': customer.province,
      'Postal Code': customer.postal_code,
      'Package': customer.selected_package,
      'Bank Name': customer.bank_name,
      'Account Type': customer.account_type,
      'Account Number': customer.account_number,
      'Account Holder Name': customer.account_holder_name,
      'Branch Code': customer.branch_code,
      'Has Credit Card': customer.has_credit_card ? 'Yes' : 'No',
      'Status': customer.is_enabled ? 'Active' : 'Disabled',
      'Points': customer.points,
      'Registration Date': customer.created_at ? new Date(customer.created_at).toISOString() : '',
      'Referral Code': customer.referral_code,
      'Referred By': customer.referred_by,
      'Agent': customer.agent_first_name && customer.agent_last_name ? 
        `${customer.agent_first_name} ${customer.agent_last_name}` : '',
      'Agent Email': customer.agent_email || ''
    }));

    const csvString = stringify(csvData, { header: true });

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');

    // Send CSV data
    res.send(csvString);

    console.log('Exported customers to CSV:', {
      customerCount: (customers as any).length
    });
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({ error: 'Failed to export customers' });
  } finally {
    connection.release();
  }
});

/**
 * Process monthly renewals - creates RENEWAL commission records for all active customers
 * This endpoint should be called on the first of each month
 * It can also be triggered manually by an admin if needed
 */
router.post('/process-monthly-renewals', async (req: any, res) => {
  try {
    console.log('Admin triggered monthly renewal processing:', {
      adminId: req.user.id,
      adminEmail: req.user.email,
      timestamp: new Date().toISOString()
    });
    
    // Log this admin action
    await logAdminAction({
      adminId: req.user.id,
      actionType: 'PROCESS_RENEWALS' as any, // Force type as PROCESS_RENEWALS is a valid action
      details: `Admin ${req.user.email} manually triggered monthly renewal processing`
    });
    
    // Dynamically import the script to avoid ESM/CommonJS issues
    const { processMonthlyRenewals } = await import('../../scripts/process-monthly-renewals.js');
    
    // Process renewals using the script
    const results = await processMonthlyRenewals();
    
    // Log results
    console.log('Monthly renewal processing completed:', results);
    
    // Return results to the client
    res.json({
      success: results.success,
      message: results.success 
        ? `Successfully processed ${results.renewalsCreated} renewal commissions for ${results.customersProcessed} customers` 
        : results.message || 'Failed to process monthly renewals',
      timestamp: new Date().toISOString(),
      details: results
    });
  } catch (error) {
    console.error('Error processing monthly renewals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process monthly renewals',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint to resend welcome email to a customer
router.post('/resend-welcome-email', async (req: any, res) => {
  const connection = await pool.getConnection();
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: "User ID is required" 
      });
    }
    
    // Get the user's details from the database
    const [userRows] = await connection.query(
      'SELECT first_name, email FROM users WHERE id = ?',
      [userId]
    );
    
    if (!userRows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const user = userRows[0];
    
    // Create a custom welcome email for existing users (without password)
    const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-rewards-logo(R).png";
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to OPIAN Rewards</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #011d3d; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #ffffff; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .btn { display: inline-block; background-color: #0056b3; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoImageUrl}" alt="OPIAN Rewards Logo" style="max-width: 200px;">
          </div>
          <div class="content">
            <h2>Welcome to OPIAN Rewards!</h2>
            <p>Dear ${user.first_name},</p>
            <p>Thank you for being a valued member of OPIAN Rewards. We're excited to have you on board!</p>
            <p>With OPIAN Rewards, you can:</p>
            <ul>
              <li>Earn points on everyday purchases</li>
              <li>Redeem rewards for cash or products</li>
              <li>Refer friends and family to earn even more</li>
              <li>Track your rewards progress through our dashboard</li>
            </ul>
            <p>Simply log in to your account at <a href="https://www.opianrewards.com">www.opianrewards.com</a> with your existing credentials to get started.</p>
            <p>If you have any questions, please don't hesitate to contact our support team at <a href="mailto:clientservices@opianrewards.com">clientservices@opianrewards.com</a>.</p>
            <p>Best regards,<br>The OPIAN Rewards Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} OPIAN Rewards. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      Welcome to OPIAN Rewards!
      
      Dear ${user.first_name},
      
      Thank you for being a valued member of OPIAN Rewards. We're excited to have you on board!
      
      With OPIAN Rewards, you can:
      - Earn points on everyday purchases
      - Redeem rewards for cash or products
      - Refer friends and family to earn even more
      - Track your rewards progress through our dashboard
      
      Simply log in to your account at www.opianrewards.com with your existing credentials to get started.
      
      If you have any questions, please don't hesitate to contact our support team at clientservices@opianrewards.com.
      
      Best regards,
      The OPIAN Rewards Team
    `;
    
    // Send the welcome email
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Welcome to OPIAN Rewards!',
      text,
      html,
      emailType: 'CUSTOMER_WELCOME_RESEND'
    });
    
    // Log the admin action
    await logAdminAction({
      adminId: req.user.id,
      targetUserId: userId,
      actionType: 'RESEND_WELCOME_EMAIL',
      details: `Resent welcome email to ${user.email}`
    });
    
    if (emailResult) {
      return res.status(200).json({
        success: true,
        message: `Welcome email resent to ${user.email} successfully`
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send welcome email"
      });
    }
  } catch (error) {
    console.error("Error resending welcome email:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while resending welcome email"
    });
  } finally {
    connection.release();
  }
});

export default router;
import { Router } from 'express';
import mysql from 'mysql2/promise';
import { checkAdmin } from '../auth';
import { logAdminAction } from '../admin-logger';

const router = Router();

// MariaDB connection pool
const pool = mysql.createPool({
  host: 'dedi1350.jnb1.host-h.net',
  user: 'admin',
  password: '8E33U976qa800F',
  database: 'opianrewards',
  port: 3306,
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

    // Get total number of customers
    const [customersCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE is_agent = 0'
    );

    // Get today's sign-ups
    const today = new Date().toISOString().split('T')[0];
    const [todaySignups] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ? AND is_agent = 0',
      [today]
    );

    // Get all agents with their statistics
    const [agents] = await connection.execute(
      `SELECT 
        a.id, a.first_name as firstName, a.last_name as lastName, 
        a.email, a.is_enabled as isEnabled, a.created_at as joinDate,
        COUNT(c.id) as totalCustomers,
        SUM(CASE WHEN DATE(c.created_at) = ? THEN 1 ELSE 0 END) as todaySignups,
        SUM(c.points) as totalCustomerPoints
       FROM users a
       LEFT JOIN users c ON c.agent_id = a.id
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
        ) as products
       FROM users u
       LEFT JOIN product_assignments pa ON u.id = pa.user_id
       LEFT JOIN products p ON pa.product_id = p.id
       WHERE u.agent_id = ?
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [req.params.id]
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
      products: JSON.parse(customer.products)
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
        u.city,
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
    const { stringify } = require('csv-stringify/sync');
    
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
      'City': customer.city,
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

export default router;
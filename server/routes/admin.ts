import { Router } from 'express';
import { createConnection } from '../db';
import { checkAdmin } from '../auth';

const router = Router();

// Middleware to check if user is an admin
router.use(checkAdmin);

// Get agent statistics
router.get('/agents/stats', async (req: any, res) => {
  const connection = await createConnection();
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
        COUNT(DISTINCT c.id) as totalCustomers,
        COALESCE(SUM(CASE WHEN DATE(c.created_at) = ? THEN 1 ELSE 0 END), 0) as todaySignups,
        COALESCE(SUM(c.points), 0) as totalCustomerPoints
       FROM users a
       LEFT JOIN users c ON c.agent_id = a.id AND c.is_agent = 0
       WHERE a.is_agent = 1
       GROUP BY a.id
       ORDER BY totalCustomers DESC`,
      [today]
    );

    console.log('Agent statistics:', {
      totalAgents: agentsCount[0].count,
      totalCustomers: customersCount[0].count,
      todaySignups: todaySignups[0].count,
      agentsCount: Array.isArray(agents) ? agents.length : 0,
      totalPoints: agents.reduce((sum: number, agent: any) => sum + Number(agent.totalCustomerPoints || 0), 0)
    });

    res.json({
      totalAgents: agentsCount[0].count,
      totalCustomers: customersCount[0].count,
      todaySignups: todaySignups[0].count,
      agents: agents,
    });
  } catch (error) {
    console.error('Error fetching agent statistics:', error);
    res.status(500).json({ error: 'Failed to fetch agent statistics' });
  } finally {
    await connection.end();
  }
});

// Toggle agent status (enable/disable)
router.post('/agents/:id/toggle-status', async (req: any, res) => {
  const connection = await createConnection();
  try {
    console.log('Toggling agent status:', req.params.id);

    // Get current status
    const [agent] = await connection.execute(
      'SELECT is_enabled FROM users WHERE id = ? AND is_agent = 1',
      [req.params.id]
    );

    if (!agent || !Array.isArray(agent) || agent.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Toggle status
    const newStatus = agent[0].is_enabled ? 0 : 1;
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
    await connection.end();
  }
});

// Get agent details with their customers
router.get('/agents/:id/customers', async (req: any, res) => {
  const connection = await createConnection();
  try {
    console.log('Fetching customers for agent:', req.params.id);

    const [customers] = await connection.execute(
      `SELECT 
        u.*, 
        COALESCE(
          GROUP_CONCAT(
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

    const transformedCustomers = customers?.map((customer: any) => ({
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phoneNumber: customer.phone_number,
      selectedPackage: customer.selected_package,
      points: customer.points,
      createdAt: customer.created_at,
      isEnabled: Boolean(customer.is_enabled),
      products: JSON.parse(customer.products || '[]')
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
    await connection.end();
  }
});

export default router;
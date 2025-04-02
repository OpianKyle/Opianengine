import { Router, Request, Response } from 'express';
import { logAdminAction } from '../admin-logger';
import { migrateAgentCustomers } from '../../scripts/migrate-agent-customers.js';
import { getUserFromTokenOrSession } from '../auth';

const migrationRouter = Router();

/**
 * Endpoint to run the agent customers migration to populate the agent_commissions table
 * This migration adds commission records for all customers signed up by agents
 * that are not yet in the agent_commissions table
 * 
 * Requires admin authentication
 */
migrationRouter.post('/agent-customers', async (req: Request, res: Response) => {
  // Get user from session or JWT token
  const user = await getUserFromTokenOrSession(req);
  
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    if (!user.is_admin && !user.is_super_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    console.log('Starting migration of agent customers to agent_commissions table');
    
    // Run the migration using the imported function
    const results = await migrateAgentCustomers();
    
    // Log admin action
    await logAdminAction({
      adminId: user.id,
      actionType: "ADMIN_MESSAGE",
      details: `Migrated ${results.usersProcessed} agent customers to agent_commissions table. ${results.usersSkipped} skipped. ${results.errors.length} errors.`
    });
    
    // Return the results
    return res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      results
    });
  } catch (error) {
    console.error('Error migrating agent customers:', error);
    return res.status(500).json({
      success: false,
      message: 'Error migrating agent customers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default migrationRouter;
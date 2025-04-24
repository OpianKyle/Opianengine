import { Router, Request, Response } from 'express';
import { logAdminAction } from '../admin-logger';
// Using dynamic import for the migration script to handle ES Module correctly
const importMigrationScript = async () => {
  // Import the migration module dynamically
  const migrationModule = await import('../../scripts/migrate-agent-customers.js');
  return migrationModule.migrateAgentCustomers;
};
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
  console.log('Migration endpoint called:', {
    headers: {
      auth: req.headers.authorization ? 'present' : 'missing',
      cookie: req.headers.cookie ? 'present' : 'missing',
    },
    method: req.method,
    url: req.url,
    body: typeof req.body === 'object' ? 'present' : 'missing',
  });
  
  // Get user from session or JWT token
  const user = await getUserFromTokenOrSession(req);
  
  if (!user) {
    console.log('Authentication failed, no user found');
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  console.log('User authenticated:', { 
    id: user.id, 
    email: user.email,
    isAdmin: user.is_admin,
    isSuperAdmin: user.is_super_admin
  });
  
  try {
    if (!user.is_admin && !user.is_super_admin) {
      console.log('Authorization failed, user is not an admin');
      return res.status(403).json({ error: "Not authorized" });
    }
    
    console.log('Starting migration of agent customers to agent_commissions table');
    
    // Check if force production mode flag is set in the request
    const forceProductionMode = req.body.forceProductionMode === true;
    console.log(`Force production mode: ${forceProductionMode ? 'ENABLED' : 'DISABLED'}`);
    
    // Get the migration function dynamically to handle ES Module correctly
    console.log('Dynamically importing migration function');
    const migrateAgentCustomers = await importMigrationScript();
    
    // Run the migration using the imported function with the force production mode option
    console.log('Calling migrateAgentCustomers function');
    const results = await migrateAgentCustomers({ forceProductionMode });
    console.log('Migration completed with results:', results);
    
    // Log admin action
    console.log('Logging admin action');
    await logAdminAction({
      adminId: user.id,
      actionType: "ADMIN_MESSAGE",
      details: `Migrated ${results.usersProcessed} agent customers to agent_commissions table. ${results.usersSkipped} skipped. ${results.errors.length} errors.`
    });
    
    // Return the results
    console.log('Returning success response');
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
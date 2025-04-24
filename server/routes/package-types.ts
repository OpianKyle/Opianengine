import { Router, Request, Response } from 'express';
import { verifySession } from '../auth';

// Local implementation of checkAdmin middleware
async function checkAdmin(req: Request, res: Response, next: Function) {
  const user = await verifySession(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!user.is_admin && !user.is_super_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  req.user = user;
  next();
}
import { updatePackageTypes } from '../../scripts/update-package-types.js';

const packageTypesRouter = Router();

/**
 * Endpoint to update package types in the agent_commissions table
 * This migration updates old package types (BASIC, STANDARD, PREMIUM, ELITE, EXECUTIVE)
 * to the new package types (OPPORTUNITY, MOMENTUM, PROSPER, PRESTIGE, PINNACLE)
 *
 * Requires admin authentication
 */
packageTypesRouter.post('/update', checkAdmin, async (req: Request, res: Response) => {
  console.log('Admin requested to update package types');
  
  try {
    await updatePackageTypes();
    
    res.status(200).json({
      success: true,
      message: 'Package types updated successfully'
    });
  } catch (error) {
    console.error('Error updating package types:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to update package types'
    });
  }
});

export default packageTypesRouter;
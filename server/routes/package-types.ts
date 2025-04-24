import { Router, Request, Response } from 'express';
import { checkAdmin } from '../auth';
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
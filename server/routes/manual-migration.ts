import express, { Request, Response } from 'express';
import { verifySession } from '../auth';

// Local implementation of checkAdmin middleware
async function checkAdmin(req: any, res: any, next: any) {
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
import { exec } from 'child_process';
import path from 'path';

const manualMigrationRouter = express.Router();

/**
 * Endpoint to run the manual agent commission migration script
 * This will directly execute the Node.js script to migrate agent customers
 * 
 * Requires admin authentication
 */
manualMigrationRouter.post('/agent-commissions', checkAdmin, async (req: Request, res: Response) => {
  try {
    console.log('Starting manual agent commission migration...');
    
    // Get the absolute path to the migration script
    const scriptPath = path.resolve(process.cwd(), 'scripts/manual-agent-commission-migration.js');
    console.log(`Using script at: ${scriptPath}`);
    
    // Execute the script directly via child_process
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Manual migration execution error: ${error.message}`);
        return res.status(500).json({ 
          success: false, 
          message: `Error running manual migration: ${error.message}`,
          error: error 
        });
      }
      
      if (stderr) {
        console.error(`Manual migration stderr: ${stderr}`);
      }
      
      console.log('Manual migration output:', stdout);
      
      // Parse the results from stdout (assuming the script outputs JSON)
      try {
        // Look for JSON output in stdout (the script should output valid JSON results)
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        let results = {};
        
        if (jsonMatch) {
          results = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, provide a simple results object with the raw output
          results = {
            usersFound: 0,
            usersMigrated: 0,
            usersSkipped: 0,
            errors: 0,
            output: stdout.trim()
          };
        }
        
        return res.status(200).json({
          success: true,
          message: 'Manual migration completed',
          results
        });
      } catch (parseError) {
        console.error('Error parsing migration results:', parseError);
        return res.status(200).json({
          success: true,
          message: 'Manual migration completed but could not parse detailed results',
          results: {
            output: stdout.trim(),
            errors: 1
          }
        });
      }
    });
  } catch (error) {
    console.error('Manual migration error:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error running manual migration: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
});

export default manualMigrationRouter;
import { Router, Request, Response } from 'express';
import { getDevelopmentUser } from '../config';
import { generateToken } from '../auth';

const developmentRouter = Router();

// Development-only login endpoint that bypasses real authentication
developmentRouter.post('/login', (req: Request, res: Response) => {
  console.log('Development login attempt with:', req.body);
  
  const role = req.body.role || 'customer';
  
  // Get a pre-configured user based on the requested role
  const testUser = getDevelopmentUser(role as 'admin' | 'agent' | 'customer');
  
  // Generate a token
  const token = generateToken(testUser);
  
  // Set session (if using session-based auth)
  req.login(testUser, (err) => {
    if (err) {
      console.error('Session login error:', err);
      return res.status(500).json({ error: "Session error" });
    }
    
    // Return both user and token
    res.status(200).json({
      user: testUser,
      token
    });
  });
});

// Get all test users for development
developmentRouter.get('/users', (_req: Request, res: Response) => {
  const users = {
    admin: getDevelopmentUser('admin'),
    agent: getDevelopmentUser('agent'),
    customer: getDevelopmentUser('customer')
  };
  
  res.json(users);
});

// Create a fake user for testing
developmentRouter.post('/users', (req: Request, res: Response) => {
  // Create a customized test user
  const customUser = {
    ...getDevelopmentUser('customer'),
    ...req.body,
    // Ensure these properties remain booleans
    is_admin: Boolean(req.body.is_admin),
    is_super_admin: Boolean(req.body.is_super_admin),
    is_agent: Boolean(req.body.is_agent),
    is_enabled: Boolean(req.body.is_enabled),
  };
  
  const token = generateToken(customUser);
  
  res.status(201).json({
    user: customUser,
    token
  });
});

export default developmentRouter;
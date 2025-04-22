import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware
 * 
 * This middleware checks if a user is authenticated before allowing access to protected routes.
 * It uses the authentication state set by the Passport middleware in the main application.
 */
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if the user is authenticated via session or token (token auth handled in verifyJwtToken middleware)
  if (req.isAuthenticated() || req.user) {
    return next();
  }
  
  // User is not authenticated
  return res.status(401).json({
    success: false,
    message: 'Authentication required',
  });
};
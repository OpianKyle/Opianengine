import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate API key for non-browser requests
 * This is a simple implementation for the test endpoints
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  // For development/test purposes, we'll accept a header-based approach
  // In production, this would be more robust with proper API key storage and validation
  const apiKey = req.headers['x-api-key'];
  
  // For test endpoints, accept 'test-api-key' or any user-provided key that starts with 'test-'
  if (apiKey && (apiKey === 'test-api-key' || apiKey.toString().startsWith('test-'))) {
    return next();
  }
  
  // If no valid API key but user is authenticated via session, allow access
  if (req.isAuthenticated()) {
    return next();
  }

  // Otherwise reject with 401
  return res.status(401).json({
    error: 'Invalid or missing API key',
    message: 'You must provide a valid API key or be authenticated via session'
  });
}
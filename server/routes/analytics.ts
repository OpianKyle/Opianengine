import { Router } from 'express';
import { getSocialMediaTraffic, getDeviceTypes, getTrafficSources } from '../analytics/google-analytics';
import { getUserFromTokenOrSession } from '../auth';

const router = Router();

// Middleware to check if user is admin
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const user = await getUserFromTokenOrSession(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!user.is_admin && !user.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Error in requireAdmin middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get social media traffic data
router.get('/social-traffic', requireAdmin, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({ error: 'Invalid days parameter. Must be between 1 and 365.' });
    }
    
    const data = await getSocialMediaTraffic(days);
    
    if (data.error) {
      return res.status(500).json({ 
        error: data.error,
        details: data.details || 'Unknown error',
        results: [],
        total: { sessions: 0, users: 0 }
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching social media traffic:', error);
    res.status(500).json({ 
      error: 'Failed to fetch social media traffic data',
      details: (error as Error).message,
      results: [],
      total: { sessions: 0, users: 0 }
    });
  }
});

// Get device types data
router.get('/device-types', requireAdmin, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({ error: 'Invalid days parameter. Must be between 1 and 365.' });
    }
    
    const data = await getDeviceTypes(days);
    
    if ('error' in data) {
      return res.status(500).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching device types:', error);
    res.status(500).json({ 
      error: 'Failed to fetch device types data',
      details: (error as Error).message
    });
  }
});

// Get traffic sources data
router.get('/traffic-sources', requireAdmin, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({ error: 'Invalid days parameter. Must be between 1 and 365.' });
    }
    
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({ error: 'Invalid limit parameter. Must be between 1 and 50.' });
    }
    
    const data = await getTrafficSources(days, limit);
    
    if ('error' in data) {
      return res.status(500).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching traffic sources:', error);
    res.status(500).json({ 
      error: 'Failed to fetch traffic sources data',
      details: (error as Error).message
    });
  }
});

export default router;
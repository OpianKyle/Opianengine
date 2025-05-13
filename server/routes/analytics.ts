import { Router } from 'express';
import { getSocialTrafficData, getDeviceTypeData, getTrafficSourceData } from '../analytics/google-analytics';
import { getUserFromTokenOrSession } from '../utils/auth';

const router = Router();

// Middleware to ensure user is admin
const requireAdmin = async (req, res, next) => {
  const user = await getUserFromTokenOrSession(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  
  next();
};

// Get social media traffic data
router.get('/social-traffic', requireAdmin, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const data = await getSocialTrafficData(days);
    res.json(data);
  } catch (error) {
    console.error('Error in social traffic endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch social media traffic data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get device type data
router.get('/device-types', requireAdmin, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const data = await getDeviceTypeData(days);
    res.json(data);
  } catch (error) {
    console.error('Error in device types endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch device data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get traffic source data
router.get('/traffic-sources', requireAdmin, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const data = await getTrafficSourceData(days, limit);
    res.json(data);
  } catch (error) {
    console.error('Error in traffic sources endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch traffic source data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
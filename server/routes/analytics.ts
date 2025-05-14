import { Router } from 'express';
import { getSocialMediaTraffic, getDeviceTypes, getTrafficSources } from '../analytics/google-analytics';
import { getUserFromTokenOrSession, checkSocial } from '../auth';

const router = Router();

// Get social media traffic data
router.get('/social-traffic', checkSocial, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({ error: 'Invalid days parameter. Must be between 1 and 365.' });
    }
    
    const data = await getSocialMediaTraffic(days);
    
    if (data.error) {
      // Create default results for error case too
      const defaultSocialNetworks = [
        'Facebook', 
        'Instagram', 
        'Twitter', 
        'LinkedIn', 
        'Pinterest', 
        'YouTube', 
        'Reddit', 
        'TikTok',
        'WhatsApp'
      ];
      
      const defaultResults = defaultSocialNetworks.map((network, index) => ({
        id: `social-default-${index}`,
        name: network,
        source: network,
        sessions: 0,
        users: 0,
        color: getSocialNetworkColor(network),
      }));
      
      return res.status(500).json({ 
        error: data.error,
        details: data.details || 'Unknown error',
        results: defaultResults,
        total: { sessions: 0, users: 0 }
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching social media traffic:', error);
    // Create default social platform data
    const defaultSocialNetworks = [
      'Facebook', 
      'Instagram', 
      'Twitter', 
      'LinkedIn', 
      'Pinterest', 
      'YouTube', 
      'Reddit', 
      'TikTok',
      'WhatsApp'
    ];
    
    const defaultResults = defaultSocialNetworks.map((network, index) => ({
      id: `social-default-${index}`,
      name: network,
      source: network,
      sessions: 0,
      users: 0,
      color: getSocialNetworkColor(network),
    }));
    
    res.status(500).json({ 
      error: 'Failed to fetch social media traffic data',
      details: (error as Error).message,
      results: defaultResults,
      total: { sessions: 0, users: 0 }
    });
  }
});

// Helper function to get color for social networks
function getSocialNetworkColor(network: string): string {
  const colorMap: Record<string, string> = {
    'Facebook': '#1877F2',
    'Instagram': '#E1306C',
    'Twitter': '#1DA1F2', 
    'LinkedIn': '#0077B5',
    'Pinterest': '#E60023',
    'YouTube': '#FF0000',
    'Reddit': '#FF4500',
    'TikTok': '#000000',
    'WhatsApp': '#25D366',
    'Other': '#808080'
  };
  
  return colorMap[network] || '#808080';
}

// Get device types data
router.get('/device-types', checkSocial, async (req, res) => {
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
router.get('/traffic-sources', checkSocial, async (req, res) => {
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
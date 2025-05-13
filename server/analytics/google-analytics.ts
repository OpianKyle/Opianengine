import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { JWT } from 'google-auth-library';

// Create a client with service account credentials
const createGAClient = async () => {
  try {
    // Check for required environment variables
    if (!process.env.GOOGLE_ANALYTICS_PRIVATE_KEY || !process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL) {
      console.error('Missing required Google Analytics credentials in environment variables');
      return null;
    }

    if (!process.env.VITE_GA_MEASUREMENT_ID) {
      console.error('Missing Google Analytics Measurement ID (VITE_GA_MEASUREMENT_ID)');
      return null;
    }

    // Debug information to help diagnose issues
    console.log('GA Credentials check:', {
      hasPrivateKey: !!process.env.GOOGLE_ANALYTICS_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
      clientEmailStart: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL?.substring(0, 8) + '...',
      privateKeyLength: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.length,
      measurementId: process.env.VITE_GA_MEASUREMENT_ID
    });

    // Fix private key format (Replit environment variables can escape newlines)
    let privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY;
    
    // Handle different formats of private key from environment variables
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // If the key doesn't start with BEGIN PRIVATE KEY, it's likely not formatted correctly
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('Private key appears to be malformed, missing BEGIN PRIVATE KEY');
      return null;
    }

    // Create a JWT auth client with proper error handling
    const auth = new JWT({
      email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    // Test the authentication before proceeding
    try {
      // Attempt to get a token to verify authentication works
      await auth.authorize();
      console.log('Google Analytics authentication successful');
    } catch (authError) {
      console.error('Google Analytics authentication failed:', authError);
      return null;
    }

    // Parse the measurement ID to get property ID
    const propertyId = process.env.VITE_GA_MEASUREMENT_ID.replace('G-', '');
    
    // Create the Analytics Data client with the JWT auth
    const analyticsDataClient = new BetaAnalyticsDataClient({ 
      auth,
      projectId: propertyId
    });
    
    console.log('Successfully created Google Analytics client');
    
    // Verify the client can connect to the API
    try {
      // Make a simple test request to verify connectivity
      const testRequest = {
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }],
      };
      
      await analyticsDataClient.runReport(testRequest);
      console.log('Successfully connected to Google Analytics API');
    } catch (apiError) {
      console.error('Error connecting to Google Analytics API:', apiError);
      console.error('API Error code:', apiError.code);
      console.error('API Error details:', apiError.details);
      
      // Check for permission issues
      if (apiError.message && apiError.message.includes('permission')) {
        console.error('Permission denied: Make sure the service account has access to the GA4 property');
      }
      
      return null;
    }
    
    return analyticsDataClient;
  } catch (error) {
    console.error('Error creating Google Analytics client:', error);
    return null;
  }
};

/**
 * Get social media traffic data from Google Analytics
 * @param days Number of days to look back
 * @returns Object with social media traffic data
 */
export async function getSocialMediaTraffic(days: number = 30) {
  const client = await createGAClient();
  
  if (!client) {
    console.error('Failed to create Google Analytics client in getSocialMediaTraffic');
    return { 
      error: 'Google Analytics client could not be initialized',
      results: [],
      total: { sessions: 0, users: 0 } 
    };
  }
  
  // Google Analytics property ID 
  const propertyId = process.env.VITE_GA_MEASUREMENT_ID?.replace('G-', '') || '';

  if (!propertyId) {
    console.error('Google Analytics property ID not configured');
    return { 
      error: 'Google Analytics property ID not configured',
      results: [],
      total: { sessions: 0, users: 0 } 
    };
  }
  
  console.log(`Attempting to fetch Google Analytics data for property ID: ${propertyId}`);
  console.log(`Time range: ${days} days ago to today`);

  try {
    // Colors for different social networks
    const socialNetworkColors: Record<string, string> = {
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

    // Run the social source report
    const [socialReport] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`,
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'sessionSource',
        },
      ],
      metrics: [
        {
          name: 'sessions',
        },
        {
          name: 'totalUsers',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'sessionMedium',
          stringFilter: {
            value: 'social',
            matchType: 'EXACT',
          },
        },
      },
    });

    // Get totals for all traffic for comparison
    const [totalReport] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`,
          endDate: 'today',
        },
      ],
      metrics: [
        {
          name: 'sessions',
        },
        {
          name: 'totalUsers',
        },
      ],
    });

    // Format the social network data
    const results = (socialReport.rows || []).map((row, index) => {
      const sourceName = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
      const users = parseInt(row.metricValues?.[1]?.value || '0', 10);
      
      // Determine which social network this is
      let network = 'Other';
      if (sourceName.toLowerCase().includes('facebook') || sourceName.toLowerCase().includes('fb.com')) {
        network = 'Facebook';
      } else if (sourceName.toLowerCase().includes('instagram') || sourceName.toLowerCase().includes('ig')) {
        network = 'Instagram';
      } else if (sourceName.toLowerCase().includes('twitter') || sourceName.toLowerCase().includes('t.co') || sourceName.toLowerCase().includes('x.com')) {
        network = 'Twitter';
      } else if (sourceName.toLowerCase().includes('linkedin')) {
        network = 'LinkedIn';
      } else if (sourceName.toLowerCase().includes('pinterest')) {
        network = 'Pinterest';
      } else if (sourceName.toLowerCase().includes('youtube') || sourceName.toLowerCase().includes('youtu.be')) {
        network = 'YouTube';
      } else if (sourceName.toLowerCase().includes('reddit')) {
        network = 'Reddit';
      } else if (sourceName.toLowerCase().includes('tiktok')) {
        network = 'TikTok';
      } else if (sourceName.toLowerCase().includes('whatsapp')) {
        network = 'WhatsApp';
      }
      
      return {
        id: `social-${index}`,
        name: network,
        source: sourceName,
        sessions,
        users,
        color: socialNetworkColors[network] || '#808080',
      };
    });

    // Group by network name (combining multiple sources for the same network)
    const networkMap = new Map();
    results.forEach(item => {
      if (networkMap.has(item.name)) {
        const existing = networkMap.get(item.name);
        existing.sessions += item.sessions;
        existing.users += item.users;
      } else {
        networkMap.set(item.name, { ...item });
      }
    });

    // Get the totals from the total report
    const totalSessions = parseInt(totalReport.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
    const totalUsers = parseInt(totalReport.rows?.[0]?.metricValues?.[1]?.value || '0', 10);

    return {
      results: Array.from(networkMap.values()).sort((a, b) => b.sessions - a.sessions),
      total: {
        sessions: totalSessions,
        users: totalUsers,
      }
    };
  } catch (error) {
    console.error('Error fetching social media traffic from Google Analytics:', error);
    return { 
      error: 'Error fetching social media traffic data',
      details: (error as Error).message,
      results: [],
      total: { sessions: 0, users: 0 }
    };
  }
}

/**
 * Get device type breakdown from Google Analytics
 * @param days Number of days to look back
 * @returns Array with device type data
 */
export async function getDeviceTypes(days: number = 30) {
  const client = createGAClient();
  
  if (!client) {
    return { error: 'Google Analytics client could not be initialized' };
  }
  
  // Google Analytics property ID 
  const propertyId = process.env.VITE_GA_MEASUREMENT_ID?.replace('G-', '') || '';

  if (!propertyId) {
    return { error: 'Google Analytics property ID not configured' };
  }

  try {
    // Run the device type report
    const [deviceReport] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`,
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'deviceCategory',
        },
      ],
      metrics: [
        {
          name: 'sessions',
        },
      ],
    });

    // Format the device data
    const results = (deviceReport.rows || []).map((row) => {
      const device = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
      
      return {
        device,
        sessions,
      };
    });

    return results;
  } catch (error) {
    console.error('Error fetching device types from Google Analytics:', error);
    return { 
      error: 'Error fetching device type data',
      details: (error as Error).message
    };
  }
}

/**
 * Get top traffic sources from Google Analytics
 * @param days Number of days to look back
 * @param limit Maximum number of sources to return
 * @returns Array with traffic source data
 */
export async function getTrafficSources(days: number = 30, limit: number = 10) {
  const client = createGAClient();
  
  if (!client) {
    return { error: 'Google Analytics client could not be initialized' };
  }
  
  // Google Analytics property ID 
  const propertyId = process.env.VITE_GA_MEASUREMENT_ID?.replace('G-', '') || '';

  if (!propertyId) {
    return { error: 'Google Analytics property ID not configured' };
  }

  try {
    // Run the traffic sources report
    const [sourcesReport] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`,
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'sessionSource',
        },
      ],
      metrics: [
        {
          name: 'sessions',
        },
      ],
      orderBys: [
        {
          metric: {
            metricName: 'sessions',
          },
          desc: true,
        },
      ],
      limit,
    });

    // Format the source data
    const results = (sourcesReport.rows || []).map((row) => {
      const source = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
      
      return {
        source,
        sessions,
      };
    });

    return results;
  } catch (error) {
    console.error('Error fetching traffic sources from Google Analytics:', error);
    return { 
      error: 'Error fetching traffic source data',
      details: (error as Error).message
    };
  }
}
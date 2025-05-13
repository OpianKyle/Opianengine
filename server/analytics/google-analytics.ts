import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Create a client for fetching analytics data
const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

// Your Google Analytics 4 property ID
const propertyId = '418254539'; // This should match your G-GPVTEJ3641 ID's numeric property ID

/**
 * Fetches social media referral data from Google Analytics
 * @param days Number of days to look back (default: 30)
 */
export async function getSocialTrafficData(days = 30) {
  try {
    const [response] = await analyticsDataClient.runReport({
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
          name: 'activeUsers',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'sessionSource',
          stringFilter: {
            matchType: 'CONTAINS',
            value: '',
            caseSensitive: false,
          },
        },
      },
    });

    // Process response into social media sources
    const socialNetworks = [
      { id: 'facebook', name: 'Facebook', pattern: /facebook|fb\.com|m\.facebook/, color: '#1877F2' },
      { id: 'instagram', name: 'Instagram', pattern: /instagram|l\.instagram/, color: '#E4405F' },
      { id: 'twitter', name: 'Twitter/X', pattern: /twitter|t\.co|x\.com/, color: '#1DA1F2' },
      { id: 'linkedin', name: 'LinkedIn', pattern: /linkedin|lnkd\.in/, color: '#0A66C2' },
      { id: 'youtube', name: 'YouTube', pattern: /youtube|youtu\.be/, color: '#FF0000' },
      { id: 'tiktok', name: 'TikTok', pattern: /tiktok/, color: '#000000' },
      { id: 'pinterest', name: 'Pinterest', pattern: /pinterest/, color: '#BD081C' },
      { id: 'reddit', name: 'Reddit', pattern: /reddit/, color: '#FF4500' },
    ];

    const results = socialNetworks.map(network => {
      const matchingRows = response.rows?.filter(row => 
        network.pattern.test(row.dimensionValues?.[0].value?.toLowerCase() || '')
      ) || [];
      
      const sessions = matchingRows.reduce((sum, row) => 
        sum + parseInt(row.metricValues?.[0].value || '0'), 0);
      
      const users = matchingRows.reduce((sum, row) => 
        sum + parseInt(row.metricValues?.[1].value || '0'), 0);
      
      return {
        id: network.id,
        name: network.name,
        sessions,
        users,
        color: network.color,
      };
    });

    // Add a total for all social networks
    const totalSessions = results.reduce((sum, item) => sum + item.sessions, 0);
    const totalUsers = results.reduce((sum, item) => sum + item.users, 0);

    return {
      results: results.filter(r => r.sessions > 0), // Only show networks with traffic
      total: { sessions: totalSessions, users: totalUsers }
    };
  } catch (error) {
    console.error('Error fetching Google Analytics data:', error);
    return { 
      results: [], 
      total: { sessions: 0, users: 0 },
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetches device type breakdown for visitors
 */
export async function getDeviceTypeData(days = 30) {
  try {
    const [response] = await analyticsDataClient.runReport({
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

    // Format the response
    const deviceData = response.rows?.map(row => ({
      device: row.dimensionValues?.[0].value || 'unknown',
      sessions: parseInt(row.metricValues?.[0].value || '0'),
    })) || [];

    return deviceData;
  } catch (error) {
    console.error('Error fetching device type data:', error);
    return [];
  }
}

/**
 * Fetches traffic source data (shows all referral sources)
 */
export async function getTrafficSourceData(days = 30, limit = 10) {
  try {
    const [response] = await analyticsDataClient.runReport({
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

    // Format the response
    const sourceData = response.rows?.map(row => ({
      source: row.dimensionValues?.[0].value || 'direct',
      sessions: parseInt(row.metricValues?.[0].value || '0'),
    })) || [];

    return sourceData;
  } catch (error) {
    console.error('Error fetching traffic source data:', error);
    return [];
  }
}
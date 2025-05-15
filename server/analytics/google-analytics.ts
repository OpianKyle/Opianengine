import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GoogleAuth } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Helper function to get color for social networks
function getNetworkColor(network: string): string {
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

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Analytics credentials handling for both production and development environments
let credentials: any = null;
let useKeyFile = false;
let credentialsPath = '';

// First approach: Use direct credentials from environment variables (best for production)
if (process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL && process.env.GOOGLE_ANALYTICS_PRIVATE_KEY) {
  console.log('Using Google Analytics credentials from environment variables');
  credentials = {
    client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
  useKeyFile = false;
} 
// Second approach: Check for credentials file in several locations
else {
  useKeyFile = true;
  
  // Try different possible paths where the credentials file might be located
  const possiblePaths = [
    // Development environment paths
    path.join(__dirname, './opianrewards-459707-8efa68d16b95.json'),
    path.join(__dirname, './opianrewards-488980111-8efa68d16b95.json'),
    
    // Production environment paths (for Render)
    path.join(process.cwd(), './opianrewards-459707-8efa68d16b95.json'),
    path.join(process.cwd(), './server/analytics/opianrewards-459707-8efa68d16b95.json'),
    
    // If there's a specific environment variable for the file path
    process.env.GA_CREDENTIALS_PATH ? process.env.GA_CREDENTIALS_PATH : '',
    
    // Common deployment patterns for production
    path.join(process.cwd(), 'dist/opianrewards-459707-8efa68d16b95.json'),
    path.join(process.cwd(), 'dist/server/analytics/opianrewards-459707-8efa68d16b95.json'),
  ].filter(Boolean); // Remove empty strings
  
  // Try each path until we find an existing file
  for (const path of possiblePaths) {
    if (path && fs.existsSync(path)) {
      credentialsPath = path;
      console.log(`Found Google Analytics credentials file at: ${credentialsPath}`);
      break;
    }
  }
  
  // If we still haven't found a file, log all attempted paths
  if (!credentialsPath) {
    console.error('Could not locate Google Analytics credentials file. Tried the following paths:');
    possiblePaths.forEach(path => console.error(`- ${path}`));
  }
}

// Define error types for the Google Analytics client
type GAClientError = {
  error: string;
  message: string;
  serviceAccount?: string;
  propertyId?: string;
  code?: string;
};

// Create a client with service account credentials
// Returns either a valid BetaAnalyticsDataClient or an error object
const createGAClient = async (): Promise<BetaAnalyticsDataClient | GAClientError | null> => {
  try {
    // Get GA4 property ID from environment variable or use the default
    const propertyId = process.env.GA_PROPERTY_ID || '488980111'; // Default property ID from project
    
    // Formatted property ID required by the Google Analytics Data API
    const formattedPropertyId = `properties/${propertyId}`;
    console.log(`Using Google Analytics property ID: ${propertyId} (formatted as ${formattedPropertyId})`);

    // Authentication approach based on what credentials we have available
    let auth;
    let serviceAccountEmail = '';
    
    if (!useKeyFile && credentials) {
      // Use credentials directly from environment variables
      console.log('Creating Google Auth client from environment variables');
      serviceAccountEmail = credentials.client_email;
      console.log(`Using Google Analytics service account: ${serviceAccountEmail}`);
      
      auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
    } 
    else if (useKeyFile && credentialsPath && fs.existsSync(credentialsPath)) {
      // Use credentials from file
      console.log(`Creating Google Auth client from key file: ${credentialsPath}`);
      
      // Read the service account email from credentials for better error messages
      try {
        const credentialsContent = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        serviceAccountEmail = credentialsContent.client_email;
        console.log(`Using Google Analytics service account: ${serviceAccountEmail}`);
      } catch (readError) {
        console.error('Failed to read service account email from credentials file:', readError);
      }
      
      auth = new GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
    }
    else {
      // No credentials available
      console.error('No Google Analytics credentials available');
      return {
        error: 'missing_credentials',
        message: 'Google Analytics credentials not available. Please add GOOGLE_ANALYTICS_CLIENT_EMAIL and GOOGLE_ANALYTICS_PRIVATE_KEY environment variables or ensure a credentials file exists.'
      };
    }
    
    console.log('Google Auth client created successfully');

    // Create the Analytics Data client
    const analyticsDataClient = new BetaAnalyticsDataClient({
      auth,
      projectId: propertyId,
    });
    
    console.log('Google Analytics client initialized, testing connection...');

    // Verify the client can connect to the API
    try {
      // Make a simple test request to verify connectivity
      const testRequest = {
        property: formattedPropertyId,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }],
      };
      
      await analyticsDataClient.runReport(testRequest);
      console.log('✓ Successfully connected to Google Analytics API');
      
      return analyticsDataClient;
    } catch (apiError: any) {
      console.error('Google Analytics API Connection Error:', apiError?.message || 'Unknown error');
      
      if (apiError?.code) {
        console.error('API Error code:', apiError.code);
      }
      
      // Specific error handling based on error types
      if (apiError?.message && typeof apiError.message === 'string') {
        // Permission error
        if (apiError.message.includes('permission')) {
          const errorDetail = `SERVICE ACCOUNT PERMISSION DENIED: The service account ${serviceAccountEmail} does not have permission to access Google Analytics property ${propertyId}. Please add this service account as a user in your Google Analytics property with Viewer permissions.`;
          console.error(errorDetail);
          
          return {
            error: 'permission_denied',
            message: errorDetail,
            serviceAccount: serviceAccountEmail,
            propertyId
          };
        }
        
        // Property not found
        if (apiError.message.includes('not found')) {
          const errorDetail = `PROPERTY NOT FOUND: The Google Analytics property ${propertyId} was not found. Please verify the property ID is correct.`;
          console.error(errorDetail);
          
          return {
            error: 'property_not_found',
            message: errorDetail,
            propertyId
          };
        }
      }
      
      return {
        error: 'api_connection_failed',
        message: apiError?.message || 'Failed to connect to Google Analytics API',
        code: apiError?.code
      };
    }
  } catch (error: any) {
    console.error('Error creating Google Analytics client:', error);
    return {
      error: 'initialization_error',
      message: error?.message || 'Unknown error initializing Google Analytics client'
    };
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
  
  // Check if client is an error object (returned when there's an issue connecting to GA)
  if ('error' in client) {
    console.error(`Google Analytics client error in getSocialMediaTraffic: ${client.error} - ${client.message}`);
    return { 
      error: client.error,
      details: client.message || 'Unknown error with Google Analytics client',
      results: [],
      total: { sessions: 0, users: 0 } 
    };
  }
  
  // At this point, TypeScript should know client is a BetaAnalyticsDataClient
  const analyticsClient: BetaAnalyticsDataClient = client;
  
  // Get GA4 property ID from environment variable or use the default
  const propertyId = process.env.GA_PROPERTY_ID || '488980111'; 
  // Formatted property ID required by the Google Analytics Data API
  const formattedPropertyId = `properties/${propertyId}`;
  
  console.log(`Using Google Analytics property ID: ${propertyId} (formatted as ${formattedPropertyId})`);
  console.log(`Time range: ${days} days ago to today`);

  try {
    // Using the getNetworkColor function to get colors for different social networks
    
    // Default social networks to ensure they all appear even with 0 traffic
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

    // Run the social source report
    const [socialReport] = await analyticsClient.runReport({
      property: formattedPropertyId,
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
    const [totalReport] = await analyticsClient.runReport({
      property: formattedPropertyId,
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
    const results = (socialReport.rows || []).map((row: any, index: number) => {
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
        color: getNetworkColor(network),
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
    let totalSessions = parseInt(totalReport.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
    let totalUsers = parseInt(totalReport.rows?.[0]?.metricValues?.[1]?.value || '0', 10);

    // But for consistency, recalculate totals from actual values in the map
    let calculatedTotalSessions = 0;
    let calculatedTotalUsers = 0;
    
    // Use Array.from to convert Map iterator to array for better compatibility
    Array.from(networkMap.values()).forEach(data => {
      calculatedTotalSessions += data.sessions;
      calculatedTotalUsers += data.users;
    });
    
    // Use the calculated total if it's non-zero, otherwise use the report total
    // This ensures consistency between the table data and the total displayed
    if (calculatedTotalSessions > 0) {
      totalSessions = calculatedTotalSessions;
    }
    if (calculatedTotalUsers > 0) {
      totalUsers = calculatedTotalUsers;
    }

    // Ensure all default networks are included, even with 0 traffic
    defaultSocialNetworks.forEach((network, index) => {
      if (!networkMap.has(network)) {
        networkMap.set(network, {
          id: `social-default-${index}`,
          name: network,
          source: network,
          sessions: 0,
          users: 0,
          color: getNetworkColor(network),
        });
      }
    });
    
    return {
      results: Array.from(networkMap.values()).sort((a, b) => b.sessions - a.sessions),
      total: {
        sessions: totalSessions,
        users: totalUsers,
      }
    };
  } catch (error) {
    console.error('Error fetching social media traffic from Google Analytics:', error);
    
    // Create default results with 0 values for all networks even when there's an error
    const defaultNetworks = [
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
    
    const defaultResults = defaultNetworks.map((network, index) => ({
      id: `social-default-${index}`,
      name: network,
      source: network,
      sessions: 0,
      users: 0,
      color: getNetworkColor(network),
    }));
    
    return { 
      error: 'Error fetching social media traffic data',
      details: (error as Error).message,
      results: defaultResults,
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
  const client = await createGAClient();
  
  if (!client) {
    return { error: 'Google Analytics client could not be initialized' };
  }
  
  // Check if client is an error object (returned when there's an issue connecting to GA)
  if ('error' in client) {
    console.error(`Google Analytics client error in getDeviceTypes: ${client.error} - ${client.message}`);
    return { 
      error: client.error,
      details: client.message || 'Unknown error with Google Analytics client'
    };
  }
  
  // At this point, TypeScript should know client is a BetaAnalyticsDataClient
  const analyticsClient: BetaAnalyticsDataClient = client;
  
  // Get GA4 property ID from environment variable or use the default
  const propertyId = process.env.GA_PROPERTY_ID || '488980111'; 
  // Formatted property ID required by the Google Analytics Data API
  const formattedPropertyId = `properties/${propertyId}`;
  
  console.log(`Using Google Analytics property ID: ${propertyId} (formatted as ${formattedPropertyId})`);

  try {
    // Run the device type report
    const [deviceReport] = await analyticsClient.runReport({
      property: formattedPropertyId,
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
    const results = (deviceReport.rows || []).map((row: any) => {
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
  const client = await createGAClient();
  
  if (!client) {
    return { error: 'Google Analytics client could not be initialized' };
  }
  
  // Check if client is an error object (returned when there's an issue connecting to GA)
  if ('error' in client) {
    console.error(`Google Analytics client error in getTrafficSources: ${client.error} - ${client.message}`);
    return { 
      error: client.error,
      details: client.message || 'Unknown error with Google Analytics client'
    };
  }
  
  // At this point, TypeScript should know client is a BetaAnalyticsDataClient
  const analyticsClient: BetaAnalyticsDataClient = client;
  
  // Get GA4 property ID from environment variable or use the default
  const propertyId = process.env.GA_PROPERTY_ID || '488980111'; 
  // Formatted property ID required by the Google Analytics Data API
  const formattedPropertyId = `properties/${propertyId}`;
  
  console.log(`Using Google Analytics property ID: ${propertyId} (formatted as ${formattedPropertyId})`);

  try {
    // Run the traffic sources report
    const [sourcesReport] = await analyticsClient.runReport({
      property: formattedPropertyId,
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
    const results = (sourcesReport.rows || []).map((row: any) => {
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
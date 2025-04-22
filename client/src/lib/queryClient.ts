import { QueryClient } from "@tanstack/react-query";

type FetchOptions = {
  on401?: 'throw' | 'returnNull';
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - double the cache time for better performance
      gcTime: 15 * 60 * 1000, // 15 minutes - how long inactive data remains in cache (renamed from cacheTime)
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Prevent automatic refetching when component mounts
      refetchOnReconnect: 'always', // Always refetch on network reconnection
    },
  },
});

// Constants for API endpoints we want to prefetch
// Grouped by page to allow more targeted prefetching 
export const AGENT_API_ENDPOINTS = {
  all: [
    '/api/referral/agent/leads',
    '/api/agent/customers', 
    '/api/referral/agent/commissions',
    '/api/agent/statistics'
  ],
  dashboard: [
    '/api/agent/statistics',
    '/api/referral/agent/commissions'
  ],
  customers: [
    '/api/agent/customers'
  ],
  leads: [
    '/api/referral/agent/leads'
  ]
};

export const CUSTOMER_API_ENDPOINTS = {
  all: [
    '/api/profile',
    '/api/rewards',
    '/api/products',
    '/api/transactions',
    '/api/statistics',
    '/api/referral',
    '/api/subscription'
  ],
  dashboard: [
    '/api/profile',
    '/api/statistics',
    '/api/transactions'
  ],
  products: [
    '/api/products'
  ],
  rewards: [
    '/api/rewards'
  ],
  referral: [
    '/api/referral'
  ],
  subscription: [
    '/api/subscription'
  ]
};

export const ADMIN_API_ENDPOINTS = {
  all: [
    '/api/admin/users',
    '/api/admin/statistics',
    '/api/admin/agents',
    '/api/admin/rewards',
    '/api/admin/products',
    '/api/admin/logs',
    '/api/admin/quote-requests',
    '/api/admin/redemptions'
  ],
  dashboard: [
    '/api/admin/statistics',
    '/api/admin/users'
  ],
  users: [
    '/api/admin/users'
  ],
  agents: [
    '/api/admin/agents'
  ],
  products: [
    '/api/admin/products'
  ],
  rewards: [
    '/api/admin/rewards'
  ],
  quotes: [
    '/api/admin/quote-requests'
  ],
  redemptions: [
    '/api/admin/redemptions'
  ],
  logs: [
    '/api/admin/logs'
  ]
};

/**
 * Prefetches key API data for the agent dashboard
 * @param token JWT token for authenticated requests
 * @param section Optional section name to prefetch only specific endpoints
 */
export const prefetchAgentData = async (token?: string, section?: 'dashboard' | 'customers' | 'leads' | 'all') => {
  // If section is specified, prefetch only that section's endpoints
  const endpointKey = section || 'all';
  const endpoints = AGENT_API_ENDPOINTS[endpointKey];
  
  await prefetchData(endpoints, token, `agent${section && section !== 'all' ? `-${section}` : ''}`);
};

/**
 * Prefetches key API data for the customer dashboard
 * @param token JWT token for authenticated requests
 * @param section Optional section name to prefetch only specific endpoints
 */
export const prefetchCustomerData = async (token?: string, section?: 'dashboard' | 'products' | 'rewards' | 'referral' | 'subscription' | 'all') => {
  // If section is specified, prefetch only that section's endpoints
  const endpointKey = section || 'all';
  const endpoints = CUSTOMER_API_ENDPOINTS[endpointKey];
  
  await prefetchData(endpoints, token, `customer${section && section !== 'all' ? `-${section}` : ''}`);
};

/**
 * Prefetches key API data for the admin dashboard
 * @param token JWT token for authenticated requests
 * @param section Optional section name to prefetch only specific endpoints
 */
export const prefetchAdminData = async (token?: string, section?: 'dashboard' | 'users' | 'agents' | 'products' | 'rewards' | 'quotes' | 'redemptions' | 'logs' | 'all') => {
  // If section is specified, prefetch only that section's endpoints
  const endpointKey = section || 'all';
  const endpoints = ADMIN_API_ENDPOINTS[endpointKey];
  
  await prefetchData(endpoints, token, `admin${section && section !== 'all' ? `-${section}` : ''}`);
};

/**
 * Generic data prefetching function for any role
 * @param endpoints Array of API endpoints to prefetch
 * @param token JWT token for authenticated requests
 * @param role Role name for logging purposes
 */
const prefetchData = async (endpoints: Array<string>, token?: string, role: string = 'user') => {
  // Create headers with authorization token if available
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set up fetch options
  const options = {
    headers,
    credentials: 'include' as RequestCredentials,
  };

  // Prefetch all key data endpoints
  const prefetchPromises = endpoints.map(endpoint => {
    return queryClient.prefetchQuery({
      queryKey: [endpoint, token],
      queryFn: async () => {
        try {
          // Add a cache-busting parameter to avoid browser caching
          const cacheBuster = new Date().getTime();
          const url = endpoint.includes('?') 
            ? `${endpoint}&_t=${cacheBuster}` 
            : `${endpoint}?_t=${cacheBuster}`;
          
          console.log(`Prefetching: ${url}`);
          const response = await fetch(url, {
            ...options,
            // Use priority hints for faster loading
            priority: 'high',
          });
          
          if (!response.ok) {
            // Silently fail for prefetches - we don't want to show error toasts for background fetches
            console.warn(`Failed to prefetch ${endpoint}: ${response.status}`);
            return null;
          }
          return response.json();
        } catch (error) {
          console.warn(`Error prefetching ${endpoint}:`, error);
          return null;
        }
      },
      staleTime: 10 * 60 * 1000, // 10 minutes - match the global setting
      gcTime: 15 * 60 * 1000 // 15 minutes - how long to keep inactive cache (renamed from cacheTime in newer versions)
    });
  });

  // Wait for all prefetches to complete
  await Promise.all(prefetchPromises);
  console.log(`✅ Prefetched ${role} data for instant access`);
};

export function getQueryFn({ on401 = 'throw', headers = {}, method = 'GET' }: FetchOptions = {}) {
  return async ({ queryKey }: { queryKey: (string | object)[] }) => {
    const endpoint = typeof queryKey[0] === 'string' ? queryKey[0] : '';
    const params = typeof queryKey[1] === 'object' ? queryKey[1] : undefined;
    const token = getAuthToken();
    
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    // Build headers with Authorization if token exists
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };
    
    // Add Authorization header if token exists
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401 && on401 === 'returnNull') {
        return null;
      }
      
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // If the response cannot be parsed as JSON, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  };
}

// Helper to get auth token from localStorage
function getAuthToken(): string | null {
  try {
    return localStorage.getItem("auth_token");
  } catch (error) {
    console.error("Error accessing localStorage:", error);
    return null;
  }
}

export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  customHeaders?: Record<string, string>
) {
  const token = getAuthToken();
  
  // Build headers with Authorization if token exists
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...customHeaders,
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',  // Still include credentials for session cookies
  };

  if (data !== undefined && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If the response cannot be parsed as JSON, use the status text
      errorMessage = response.statusText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
  
  // For 204 No Content, just return undefined
  if (response.status === 204) {
    return response;
  }
  
  return response;
}
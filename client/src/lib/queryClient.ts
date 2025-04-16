import { QueryClient } from "@tanstack/react-query";

type FetchOptions = {
  on401?: 'throw' | 'returnNull';
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Constants for API endpoints we want to prefetch
export const AGENT_API_ENDPOINTS = [
  '/api/referral/agent/leads',
  '/api/agent/customers', 
  '/api/referral/agent/commissions',
  '/api/agent/statistics'
];

/**
 * Prefetches key API data for the agent dashboard
 * @param token JWT token for authenticated requests
 */
export const prefetchAgentData = async (token?: string) => {
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

  // Prefetch all key agent data endpoints
  const prefetchPromises = AGENT_API_ENDPOINTS.map(endpoint => {
    return queryClient.prefetchQuery({
      queryKey: [endpoint, token],
      queryFn: async () => {
        const response = await fetch(endpoint, options);
        if (!response.ok) {
          // Silently fail for prefetches - we don't want to show error toasts for background fetches
          console.warn(`Failed to prefetch ${endpoint}: ${response.status}`);
          return null;
        }
        return response.json();
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  });

  // Wait for all prefetches to complete
  await Promise.all(prefetchPromises);
  console.log('✅ Prefetched agent data for instant access');
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
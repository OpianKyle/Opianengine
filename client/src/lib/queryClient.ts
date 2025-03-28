import { QueryClient } from "@tanstack/react-query";

// Helper function for making API requests
export async function apiRequest(method: string, url: string, body?: any) {
  // Ensure we're using the correct base URL in all environments
  // If the URL doesn't start with http or /, prefix it with /
  const apiUrl = url.startsWith('http') || url.startsWith('/') 
    ? url 
    : `/${url}`;
    
  console.log(`API Request to: ${apiUrl}`);
  
  // Get token from localStorage if available
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  
  // Add token to headers if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch(apiUrl, {
    method,
    credentials: "include", // Always include credentials
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Please log in to continue");
    }

    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || `${response.status}: ${response.statusText}`;
    } catch {
      errorMessage = await response.text() || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        try {
          // Ensure the URL is properly formatted
          const url = typeof queryKey[0] === 'string' ? queryKey[0] : '';
          const response = await apiRequest("GET", url);
          return response.json();
        } catch (error) {
          // If we get a network error, retry up to 3 times
          if (error instanceof TypeError && error.message.includes('network')) {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                const url = typeof queryKey[0] === 'string' ? queryKey[0] : '';
                apiRequest("GET", url)
                  .then(response => response.json())
                  .then(resolve)
                  .catch(reject);
              }, 1000);
            });
          }
          throw error;
        }
      },
      retry: (failureCount, error) => {
        // Retry up to 3 times for network errors
        if (error instanceof TypeError && error.message.includes('network')) {
          return failureCount < 3;
        }
        // Don't retry for other errors
        return false;
      },
      retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex), 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // Data remains fresh for 5 minutes
    },
    mutations: {
      retry: false,
    }
  },
});
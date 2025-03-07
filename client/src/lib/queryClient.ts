import { QueryClient } from "@tanstack/react-query";

// Helper function for making API requests
export async function apiRequest(method: string, url: string, body?: any) {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
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
          const response = await apiRequest("GET", queryKey[0] as string);
          return response.json();
        } catch (error) {
          // Only retry network errors
          if (error instanceof TypeError && error.message.includes('network')) {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                apiRequest("GET", queryKey[0] as string)
                  .then(response => response.json())
                  .then(resolve)
                  .catch(reject);
              }, 1000);
            });
          }
          throw error;
        }
      },
      // Improve caching and performance settings
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      cacheTime: 1000 * 60 * 30, // Cache persists for 30 minutes
      refetchOnMount: false, // Don't refetch on component mount
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      refetchOnReconnect: false, // Don't refetch on reconnection
      retry: (failureCount, error) => {
        // Only retry network errors, max 2 retries
        if (error instanceof TypeError && error.message.includes('network')) {
          return failureCount < 2;
        }
        return false;
      },
      retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex), 5000), // Exponential backoff capped at 5s
    },
    mutations: {
      retry: false,
    }
  },
});
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
          // If we get a network error, retry up to 3 times
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
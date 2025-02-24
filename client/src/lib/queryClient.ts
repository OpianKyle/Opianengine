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

    const errorText = await response.text();
    throw new Error(errorText || `${response.status}: ${response.statusText}`);
  }

  return response;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const response = await apiRequest("GET", queryKey[0] as string);
        return response.json();
      },
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 0
    },
    mutations: {
      retry: false,
    }
  },
});
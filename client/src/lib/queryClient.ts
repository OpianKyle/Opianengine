import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Please log in to continue");
          }

          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          const errorText = await res.text();
          throw new Error(errorText || `${res.status}: ${res.statusText}`);
        }

        return res.json();
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
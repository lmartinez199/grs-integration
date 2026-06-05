import { QueryClient } from "@tanstack/react-query";

import { QUERY_RETRY, QUERY_STALE_TIME } from "./constants";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: QUERY_RETRY,
      refetchOnWindowFocus: false,
      staleTime: QUERY_STALE_TIME,
    },
  },
});

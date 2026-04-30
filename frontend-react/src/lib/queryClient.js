import { QueryClient } from '@tanstack/react-query';

/**
 * Central TanStack Query client used by the app. Default options disable
 * background refetch and retries in the browser UI context.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export default queryClient;

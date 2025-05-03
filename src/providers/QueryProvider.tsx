'use client';

import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Optionally, add ReactQueryDevtools for development
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function QueryProvider({ children }: PropsWithChildren) {
  // Initialize QueryClient only once per component lifecycle
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Configure default query options if needed
            // For example: staleTime, refetchOnWindowFocus
            staleTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Optionally add ReactQueryDevtools for debugging in development */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

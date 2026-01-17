'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { CalendarProvider } from '@/lib/context/calendar-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes (increased from 1 minute)
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CalendarProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster position="top-right" richColors />
      </CalendarProvider>
    </QueryClientProvider>
  );
}


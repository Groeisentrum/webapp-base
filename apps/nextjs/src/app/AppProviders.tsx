"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthWrapper } from "@/app/AuthWrapper";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Created once per mount so a client is never shared between users during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // A 401 has already triggered sign-out by the time it surfaces; retrying
            // would only delay the redirect.
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper>{children}</AuthWrapper>
    </QueryClientProvider>
  );
}

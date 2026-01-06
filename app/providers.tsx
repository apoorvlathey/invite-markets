"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThirdwebProvider } from "thirdweb/react";
import { ToastProvider } from "@/app/components/Toast";
import { AccessGateProvider } from "@/app/components/AccessGateProvider";
import { FarcasterProvider } from "@/app/components/FarcasterProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThirdwebProvider>
      <QueryClientProvider client={queryClient}>
        <FarcasterProvider>
          <ToastProvider>
            <AccessGateProvider>{children}</AccessGateProvider>
          </ToastProvider>
        </FarcasterProvider>
      </QueryClientProvider>
    </ThirdwebProvider>
  );
}

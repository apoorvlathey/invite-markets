"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { useState } from "react";
import { config } from "@/lib/wagmi";
import { ThirdwebProvider } from "thirdweb/react";
import { ToastProvider } from "@/app/components/Toast";
import { AccessGateProvider } from "@/app/components/AccessGateProvider";
import { FarcasterProvider } from "@/app/components/FarcasterProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThirdwebProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <FarcasterProvider>
            <ToastProvider>
              <AccessGateProvider>{children}</AccessGateProvider>
            </ToastProvider>
          </FarcasterProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThirdwebProvider>
  );
}

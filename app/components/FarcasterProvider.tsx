"use client";

import { useEffect, useState } from "react";
import { useConnect, useAccount } from "wagmi";
import { initFarcasterSDK, isFarcasterMiniApp } from "@/lib/farcaster";

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    async function init() {
      // Check if we're in a Farcaster mini-app context
      if (!isFarcasterMiniApp()) {
        setIsInitialized(true);
        return;
      }

      // Initialize the Farcaster SDK
      const success = await initFarcasterSDK();

      if (success && !isConnected) {
        // Find the Farcaster connector
        const farcasterConnector = connectors.find(
          (c) =>
            c.id === "farcasterFrame" ||
            c.name.toLowerCase().includes("farcaster")
        );

        if (farcasterConnector) {
          try {
            // Auto-connect using Farcaster wallet
            connect({ connector: farcasterConnector });
          } catch (error) {
            console.error("Failed to auto-connect Farcaster wallet:", error);
          }
        }
      }

      setIsInitialized(true);
    }

    init();
  }, [connect, connectors, isConnected]);

  // Optionally show a loading state while initializing in Farcaster context
  if (!isInitialized && isFarcasterMiniApp()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

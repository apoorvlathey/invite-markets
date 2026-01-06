"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, useSetActiveWallet } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { EIP1193 } from "thirdweb/wallets";
import {
  initFarcasterSDK,
  isFarcasterMiniApp,
  getFarcasterProvider,
  isMiniAppAdded,
  promptAddMiniApp,
} from "@/lib/farcaster";

const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const activeAccount = useActiveAccount();
  const setActiveWallet = useSetActiveWallet();

  useEffect(() => {
    async function init() {
      // Check if we're in a Farcaster mini-app context
      if (!isFarcasterMiniApp()) {
        setIsInitialized(true);
        return;
      }

      // Initialize the Farcaster SDK
      const success = await initFarcasterSDK();

      if (success) {
        // Check if the user has added this mini app and prompt them if not
        const isAdded = await isMiniAppAdded();
        if (!isAdded) {
          console.log("Mini app not added, prompting user to add it...");
          await promptAddMiniApp();
        }

        // Auto-connect the Farcaster wallet if not already connected
        if (!activeAccount) {
          try {
            // Get the Farcaster EIP-1193 provider
            const farcasterProvider = getFarcasterProvider();

            if (farcasterProvider) {
              // Convert the Farcaster provider to a thirdweb wallet using the EIP1193 adapter
              const thirdwebWallet = EIP1193.fromProvider({
                provider: farcasterProvider,
              });

              // Connect the wallet
              await thirdwebWallet.connect({
                client: thirdwebClient,
              });

              // Set it as the active wallet in thirdweb
              setActiveWallet(thirdwebWallet);

              console.log("Farcaster wallet connected via thirdweb");
            }
          } catch (error) {
            console.error("Failed to auto-connect Farcaster wallet:", error);
          }
        }
      }

      setIsInitialized(true);
    }

    init();
  }, [activeAccount, setActiveWallet]);

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

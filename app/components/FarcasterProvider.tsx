"use client";

import { useEffect } from "react";
import { useActiveAccount, useSetActiveWallet } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { EIP1193 } from "thirdweb/wallets";
import {
  initMiniAppSDK,
  isMiniAppContext,
  getMiniAppProvider,
  promptAddMiniAppIfNeeded,
} from "@/lib/farcaster";

const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const activeAccount = useActiveAccount();
  const setActiveWallet = useSetActiveWallet();

  useEffect(() => {
    async function init() {
      // Check if we're in a mini app context using SDK's built-in detection
      const inMiniApp = await isMiniAppContext();
      if (!inMiniApp) return;

      // Initialize the Mini App SDK (calls sdk.actions.ready())
      // This works for any compatible client (Farcaster, Base app, etc.)
      const success = await initMiniAppSDK();
      if (!success) return;

      console.log("Mini app context detected, setting up wallet...");

      // Auto-connect the wallet if not already connected
      if (!activeAccount) {
        try {
          const miniAppProvider = getMiniAppProvider();
          if (miniAppProvider) {
            const thirdwebWallet = EIP1193.fromProvider({
              provider: miniAppProvider,
            });

            await thirdwebWallet.connect({
              client: thirdwebClient,
            });

            setActiveWallet(thirdwebWallet);
            console.log("Mini app wallet connected via thirdweb");
          }
        } catch (error) {
          console.error("Failed to auto-connect mini app wallet:", error);
        }
      }

      // Prompt to add mini app after a short delay
      setTimeout(() => {
        promptAddMiniAppIfNeeded();
      }, 1000);
    }

    init();
  }, [activeAccount, setActiveWallet]);

  return <>{children}</>;
}

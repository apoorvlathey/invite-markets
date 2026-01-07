"use client";

import { sdk } from "@farcaster/miniapp-sdk";

// Check if running in a mini app context (uses SDK's built-in detection)
// Works for any compatible client (Farcaster, Base app, etc.)
export async function isMiniAppContext(): Promise<boolean> {
  return sdk.isInMiniApp();
}

// Initialize the Mini App SDK - must be called after app loads
// This works for any client that supports the mini app SDK (Farcaster, Base app, etc.)
export async function initMiniAppSDK(): Promise<boolean> {
  try {
    await sdk.actions.ready();
    console.log("Mini App SDK initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Mini App SDK:", error);
    return false;
  }
}

// Get the mini app's Ethereum provider for wallet interactions
export function getMiniAppProvider() {
  return sdk.wallet.ethProvider;
}

// Legacy aliases for backwards compatibility
export const initFarcasterSDK = initMiniAppSDK;
export const isFarcasterMiniApp = isMiniAppContext;
export const getFarcasterProvider = getMiniAppProvider;

// Get the current user's Farcaster context
export async function getFarcasterContext() {
  try {
    const context = await sdk.context;
    return context;
  } catch {
    return null;
  }
}

// Check if the user has added this mini app to their client and prompt if not
// Uses the pattern: sdk.context && !(await sdk.context).client.added
export async function promptAddMiniAppIfNeeded(): Promise<boolean> {
  try {
    // Check if context exists and mini app is not already added
    if (sdk.context && !(await sdk.context).client.added) {
      console.log("Mini app not added, prompting user to add it...");
      await sdk.actions.addMiniApp();
      console.log("Add mini app prompt triggered");
      return true;
    }
    console.log("Mini app already added or context not available");
    return false;
  } catch (error) {
    console.error("Failed to prompt add mini app:", error);
    return false;
  }
}

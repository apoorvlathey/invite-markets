"use client";

import { sdk } from "@farcaster/miniapp-sdk";

// Check if we're running inside a Farcaster mini-app
export function isFarcasterMiniApp(): boolean {
  if (typeof window === "undefined") return false;

  // Check for Farcaster context indicators
  return (
    window.parent !== window || // In iframe
    typeof (window as unknown as { farcaster?: unknown }).farcaster !==
      "undefined" ||
    navigator.userAgent.includes("Farcaster")
  );
}

// Initialize the Farcaster SDK - must be called after app loads
export async function initFarcasterSDK() {
  try {
    await sdk.actions.ready();
    console.log("Farcaster Mini App SDK initialized");
    return true;
  } catch (error) {
    console.error("Failed to initialize Farcaster Mini App:", error);
    return false;
  }
}

// Get the Farcaster Ethereum provider for wallet interactions
export function getFarcasterProvider() {
  return sdk.wallet.ethProvider;
}

// Get the current user's Farcaster context
export async function getFarcasterContext() {
  try {
    const context = await sdk.context;
    return context;
  } catch {
    return null;
  }
}

// Check if the user has added this mini app to their Farcaster client
export async function isMiniAppAdded(): Promise<boolean> {
  try {
    const context = await sdk.context;
    return context?.client?.added ?? false;
  } catch {
    return false;
  }
}

// Prompt the user to add the mini app to their Farcaster client
export async function promptAddMiniApp(): Promise<boolean> {
  try {
    await sdk.actions.addMiniApp();
    return true;
  } catch (error) {
    console.error("Failed to prompt add mini app:", error);
    return false;
  }
}

/**
 * Server-side address resolution for OG images and other server components.
 * This is a simplified version that queries the database directly.
 */

import { connectDB } from "@/lib/mongoose";
import { ResolvedAddress, type ResolvedType } from "@/models/resolvedAddress";

// Cache expiry in days (should match the API route)
const CACHE_EXPIRY_DAYS = 2;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export interface ResolvedAddressData {
  displayName: string;
  avatarUrl: string | null;
  resolvedType: ResolvedType;
}

/**
 * Get resolved address from the server-side cache (MongoDB).
 * This is a read-only function that doesn't trigger new resolutions.
 * If the address isn't cached or is expired, returns null.
 */
export async function getResolvedAddressFromCache(
  address: string
): Promise<ResolvedAddressData | null> {
  try {
    await connectDB();

    const normalizedAddress = address.toLowerCase();
    const cacheExpiryDate = new Date(Date.now() - CACHE_EXPIRY_MS);

    const cached = await ResolvedAddress.findOne({
      address: normalizedAddress,
      resolvedAt: { $gte: cacheExpiryDate },
    }).lean();

    if (cached) {
      return {
        displayName: cached.displayName,
        avatarUrl: cached.avatarUrl,
        resolvedType: cached.resolvedType,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching resolved address from cache:", error);
    return null;
  }
}

/**
 * Format seller display info for OG images
 */
export function formatSellerForOG(
  address: string,
  resolved: ResolvedAddressData | null
): {
  displayName: string;
  shortAddress: string;
  avatarUrl: string | null;
  hasResolution: boolean;
} {
  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`;

  if (resolved) {
    // For Farcaster, prepend @
    const displayName =
      resolved.resolvedType === "farcaster"
        ? `@${resolved.displayName}`
        : resolved.displayName;

    return {
      displayName,
      shortAddress,
      avatarUrl: resolved.avatarUrl,
      hasResolution: true,
    };
  }

  return {
    displayName: shortAddress,
    shortAddress,
    avatarUrl: null,
    hasResolution: false,
  };
}

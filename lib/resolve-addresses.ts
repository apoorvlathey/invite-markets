"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { getExplorerAddressUrl } from "@/lib/chain";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Cache expiry in days.
 * Cached results older than this will be re-fetched from the API.
 * This is synced with the server-side cache expiry in the API route.
 */
export const ADDRESS_CACHE_EXPIRY_DAYS = 2;

// Convert to milliseconds for comparison
const CACHE_EXPIRY_MS = ADDRESS_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// LocalStorage key prefix for all invite-market keys
export const STORAGE_PREFIX = "@invite-market/";

// LocalStorage key
const STORAGE_KEY = `${STORAGE_PREFIX}resolved-addresses-cache`;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ResolvedType = "farcaster" | "basename" | "ens";

export interface ResolvedAddress {
  displayName: string;
  avatarUrl: string | null;
  resolvedType: ResolvedType;
}

interface CachedEntry {
  data: ResolvedAddress;
  cachedAt: number; // timestamp in ms
}

interface CacheStore {
  [address: string]: CachedEntry;
}

// ============================================================================
// LOCALSTORAGE HELPERS
// ============================================================================

/**
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Get the entire cache store from localStorage
 */
function getCacheStore(): CacheStore {
  if (!isBrowser()) return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as CacheStore;
  } catch {
    // If parsing fails, clear the corrupted cache
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

/**
 * Save the entire cache store to localStorage
 */
function saveCacheStore(store: CacheStore): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    // Handle quota exceeded or other localStorage errors
    console.warn("Failed to save address cache to localStorage:", e);
  }
}

/**
 * Check if a cached entry is still valid (not expired)
 */
function isCacheValid(entry: CachedEntry): boolean {
  return Date.now() - entry.cachedAt < CACHE_EXPIRY_MS;
}

/**
 * Get a resolved address from cache if it exists and is valid
 */
export function getFromCache(address: string): ResolvedAddress | null {
  const store = getCacheStore();
  const normalizedAddress = address.toLowerCase();
  const entry = store[normalizedAddress];

  if (entry && isCacheValid(entry)) {
    return entry.data;
  }

  return null;
}

/**
 * Get multiple addresses from cache
 * Returns a map of address -> ResolvedAddress for found & valid entries
 */
export function getMultipleFromCache(
  addresses: string[]
): Record<string, ResolvedAddress> {
  const store = getCacheStore();
  const result: Record<string, ResolvedAddress> = {};

  for (const address of addresses) {
    const normalizedAddress = address.toLowerCase();
    const entry = store[normalizedAddress];

    if (entry && isCacheValid(entry)) {
      result[normalizedAddress] = entry.data;
    }
  }

  return result;
}

/**
 * Save resolved addresses to cache (merges with existing cache)
 */
export function saveToCache(addressMap: Record<string, ResolvedAddress>): void {
  const store = getCacheStore();
  const now = Date.now();

  for (const [address, data] of Object.entries(addressMap)) {
    const normalizedAddress = address.toLowerCase();
    store[normalizedAddress] = {
      data,
      cachedAt: now,
    };
  }

  // Clean up expired entries while we're at it
  for (const [address, entry] of Object.entries(store)) {
    if (!isCacheValid(entry)) {
      delete store[address];
    }
  }

  saveCacheStore(store);
}

/**
 * Clear the entire address cache
 */
export function clearAddressCache(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// CORE RESOLUTION FUNCTION
// ============================================================================

/**
 * Resolve addresses with localStorage caching.
 *
 * 1. Check localStorage for cached valid entries
 * 2. Only fetch uncached/expired addresses from API
 * 3. Save new results to localStorage
 * 4. Return combined results
 */
export async function resolveAddresses(
  addresses: string[]
): Promise<Record<string, ResolvedAddress>> {
  if (addresses.length === 0) return {};

  // Normalize addresses
  const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());
  const uniqueAddresses = [...new Set(normalizedAddresses)];

  // Step 1: Check localStorage cache
  const cachedResults = getMultipleFromCache(uniqueAddresses);
  const cachedAddresses = new Set(Object.keys(cachedResults));

  // Step 2: Find addresses that need to be fetched
  const addressesToFetch = uniqueAddresses.filter(
    (addr) => !cachedAddresses.has(addr)
  );

  // If all addresses are cached, return immediately
  if (addressesToFetch.length === 0) {
    return cachedResults;
  }

  // Step 3: Fetch uncached addresses from API
  try {
    const response = await fetch("/api/resolve-addresses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addresses: addressesToFetch }),
    });

    if (!response.ok) {
      console.error("Failed to fetch addresses from API");
      return cachedResults; // Return what we have from cache
    }

    const results: (ResolvedAddress | undefined)[] = await response.json();

    // Step 4: Process and save new results
    const newResults: Record<string, ResolvedAddress> = {};

    addressesToFetch.forEach((addr, index) => {
      const resolved = results[index];
      if (resolved) {
        newResults[addr] = resolved;
      }
    });

    // Save new results to localStorage
    if (Object.keys(newResults).length > 0) {
      saveToCache(newResults);
    }

    // Step 5: Combine cached and new results
    return { ...cachedResults, ...newResults };
  } catch (error) {
    console.error("Error resolving addresses:", error);
    return cachedResults; // Return what we have from cache on error
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for resolving addresses with caching.
 * Uses TanStack Query for state management and localStorage for persistence.
 *
 * Features:
 * - Instantly returns cached values from localStorage
 * - Only fetches uncached addresses from API
 * - Updates localStorage with new results
 * - Shares cache across all components via TanStack Query
 */
export function useResolveAddresses(addresses: string[]) {
  const queryClient = useQueryClient();

  // Normalize and dedupe addresses
  const normalizedAddresses = useMemo(
    () => [...new Set(addresses.map((addr) => addr.toLowerCase()))],
    [addresses]
  );

  // Calculate initial cached data synchronously during render
  // This avoids the need for useEffect setState
  const cachedData = useMemo(() => {
    if (normalizedAddresses.length === 0) {
      return {};
    }
    return getMultipleFromCache(normalizedAddresses);
  }, [normalizedAddresses]);

  // Query key that represents the set of addresses
  const queryKey = useMemo(
    () => ["resolvedAddresses", normalizedAddresses.sort().join(",")],
    [normalizedAddresses]
  );

  // TanStack Query for fetching and caching
  const { data: fetchedData = {}, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (normalizedAddresses.length === 0) return {};
      return resolveAddresses(normalizedAddresses);
    },
    enabled: normalizedAddresses.length > 0,
    staleTime: CACHE_EXPIRY_MS, // Keep query fresh for the cache duration
    gcTime: CACHE_EXPIRY_MS, // Keep in memory for cache duration
    // Start with cached data to avoid loading state for cached entries
    placeholderData: (previousData) => previousData ?? cachedData,
  });

  // Merge cached data with fetched data
  // fetchedData takes precedence as it may have newer results
  const resolvedAddresses = useMemo(() => {
    return { ...cachedData, ...fetchedData };
  }, [cachedData, fetchedData]);

  // Helper to resolve a single address (useful for adding individual addresses)
  const resolveAddress = useCallback(
    async (address: string): Promise<ResolvedAddress | null> => {
      const normalizedAddress = address.toLowerCase();

      // Check if already resolved
      if (resolvedAddresses[normalizedAddress]) {
        return resolvedAddresses[normalizedAddress];
      }

      // Fetch from API
      const results = await resolveAddresses([normalizedAddress]);
      const resolved = results[normalizedAddress];

      if (resolved) {
        // Update the query cache
        queryClient.setQueryData<Record<string, ResolvedAddress>>(
          queryKey,
          (old) => ({
            ...old,
            [normalizedAddress]: resolved,
          })
        );
      }

      return resolved || null;
    },
    [resolvedAddresses, queryClient, queryKey]
  );

  return {
    resolvedAddresses,
    isLoading,
    resolveAddress,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the display info for a seller address
 * Returns displayName, avatarUrl, and link URL
 */
export function getSellerDisplayInfo(
  address: string,
  resolvedAddresses: Record<string, ResolvedAddress>
): {
  displayName: string;
  avatarUrl: string | null;
  linkUrl: string;
  resolvedType: ResolvedType | null;
  shortAddress: string;
} {
  const normalizedAddress = address.toLowerCase();
  const resolved = resolvedAddresses[normalizedAddress];
  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`;

  if (resolved) {
    const linkUrl =
      resolved.resolvedType === "farcaster"
        ? `https://warpcast.com/${resolved.displayName}`
        : getExplorerAddressUrl(address);

    return {
      displayName: resolved.displayName,
      avatarUrl: resolved.avatarUrl,
      linkUrl,
      resolvedType: resolved.resolvedType,
      shortAddress,
    };
  }

  return {
    displayName: shortAddress,
    avatarUrl: null,
    linkUrl: getExplorerAddressUrl(address),
    resolvedType: null,
    shortAddress,
  };
}

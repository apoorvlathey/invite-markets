"use client";

import { STORAGE_PREFIX } from "./resolve-addresses";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Cache expiry in hours for Ethos scores.
 * Scores don't change frequently, so 6 hours is reasonable.
 */
export const ETHOS_CACHE_EXPIRY_HOURS = 6;

// Convert to milliseconds for comparison
const CACHE_EXPIRY_MS = ETHOS_CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

// LocalStorage key
const STORAGE_KEY = `${STORAGE_PREFIX}ethos-scores-cache`;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CachedEntry {
  score: number;
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
    console.warn("Failed to save Ethos scores cache to localStorage:", e);
  }
}

/**
 * Check if a cached entry is still valid (not expired)
 */
function isCacheValid(entry: CachedEntry): boolean {
  return Date.now() - entry.cachedAt < CACHE_EXPIRY_MS;
}

/**
 * Get an Ethos score from cache if it exists and is valid
 */
export function getEthosScoreFromCache(address: string): number | null {
  const store = getCacheStore();
  const normalizedAddress = address.toLowerCase();
  const entry = store[normalizedAddress];

  if (entry && isCacheValid(entry)) {
    return entry.score;
  }

  return null;
}

/**
 * Get multiple Ethos scores from cache
 * Returns a map of address -> score for found & valid entries
 */
export function getMultipleEthosScoresFromCache(
  addresses: string[]
): Record<string, number> {
  const store = getCacheStore();
  const result: Record<string, number> = {};

  for (const address of addresses) {
    const normalizedAddress = address.toLowerCase();
    const entry = store[normalizedAddress];

    if (entry && isCacheValid(entry)) {
      result[normalizedAddress] = entry.score;
    }
  }

  return result;
}

/**
 * Save Ethos scores to cache (merges with existing cache)
 */
export function saveEthosScoresToCache(
  scoreMap: Record<string, number>
): void {
  const store = getCacheStore();
  const now = Date.now();

  for (const [address, score] of Object.entries(scoreMap)) {
    const normalizedAddress = address.toLowerCase();
    store[normalizedAddress] = {
      score,
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
 * Clear the entire Ethos scores cache
 */
export function clearEthosScoresCache(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// CORE FETCH FUNCTION WITH CACHING
// ============================================================================

/**
 * Fetch Ethos scores with localStorage caching.
 *
 * 1. Check localStorage for cached valid entries
 * 2. Only fetch uncached/expired addresses from API
 * 3. Save new results to localStorage
 * 4. Return combined results
 */
export async function fetchEthosScores(
  addresses: string[]
): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};

  // Normalize addresses
  const normalizedAddresses = addresses.map((a) => a.toLowerCase());

  // Check cache first
  const cached = getMultipleEthosScoresFromCache(normalizedAddresses);
  const cachedAddresses = new Set(Object.keys(cached));

  // Find addresses that need fetching
  const uncachedAddresses = normalizedAddresses.filter(
    (addr) => !cachedAddresses.has(addr)
  );

  // If everything is cached, return early
  if (uncachedAddresses.length === 0) {
    return cached;
  }

  // Fetch uncached addresses from API
  const freshScores: Record<string, number> = {};

  try {
    const response = await fetch(
      "https://api.ethos.network/api/v2/score/addresses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addresses: uncachedAddresses }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      Object.keys(data).forEach((address) => {
        if (data[address]?.score !== undefined) {
          freshScores[address.toLowerCase()] = data[address].score;
        }
      });

      // Save fresh scores to cache
      if (Object.keys(freshScores).length > 0) {
        saveEthosScoresToCache(freshScores);
      }
    }
  } catch (err) {
    console.error("Error fetching Ethos scores:", err);
  }

  // Combine cached and fresh results
  return { ...cached, ...freshScores };
}


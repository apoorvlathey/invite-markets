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

export interface EthosData {
  score: number;
  level: string;
}

export interface TrustLevelConfig {
  bg: string;
  border: string;
  text: string;
  dot: string;
  label: string;
}

// ============================================================================
// TRUST LEVEL DISPLAY CONFIG
// ============================================================================

/**
 * Get display configuration (colors, label) for an Ethos trust level.
 * Used to render consistent trust level badges across the app.
 */
export function getTrustLevelConfig(level: string): TrustLevelConfig {
  const normalizedLevel = level.toLowerCase();

  switch (normalizedLevel) {
    case "trusted":
    case "established":
      return {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        dot: "bg-emerald-400",
        label: normalizedLevel === "established" ? "Established" : "Trusted",
      };
    case "neutral":
      return {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        text: "text-blue-400",
        dot: "bg-blue-400",
        label: "Neutral",
      };
    case "questionable":
      return {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        text: "text-yellow-400",
        dot: "bg-yellow-400",
        label: "Questionable",
      };
    case "untrusted":
      return {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-400",
        dot: "bg-red-400",
        label: "Untrusted",
      };
    default:
      return {
        bg: "bg-zinc-500/10",
        border: "border-zinc-500/30",
        text: "text-zinc-400",
        dot: "bg-zinc-400",
        label: "Unknown",
      };
  }
}

interface CachedEntry {
  score: number;
  level: string;
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
 * Get Ethos data (score and level) from cache if it exists and is valid
 */
export function getEthosDataFromCache(address: string): EthosData | null {
  const store = getCacheStore();
  const normalizedAddress = address.toLowerCase();
  const entry = store[normalizedAddress];

  if (entry && isCacheValid(entry)) {
    return {
      score: entry.score,
      level: entry.level,
    };
  }

  return null;
}

/**
 * Get multiple Ethos data (score and level) from cache
 * Returns a map of address -> EthosData for found & valid entries
 */
export function getMultipleEthosDataFromCache(
  addresses: string[]
): Record<string, EthosData> {
  const store = getCacheStore();
  const result: Record<string, EthosData> = {};

  for (const address of addresses) {
    const normalizedAddress = address.toLowerCase();
    const entry = store[normalizedAddress];

    if (entry && isCacheValid(entry)) {
      result[normalizedAddress] = {
        score: entry.score,
        level: entry.level,
      };
    }
  }

  return result;
}

/**
 * Save Ethos data (score and level) to cache (merges with existing cache)
 */
export function saveEthosDataToCache(
  dataMap: Record<string, EthosData>
): void {
  const store = getCacheStore();
  const now = Date.now();

  for (const [address, data] of Object.entries(dataMap)) {
    const normalizedAddress = address.toLowerCase();
    store[normalizedAddress] = {
      score: data.score,
      level: data.level,
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
 * Clear the entire Ethos cache
 */
export function clearEthosCache(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// CORE FETCH FUNCTION WITH CACHING
// ============================================================================

/**
 * Fetch Ethos data (score and level) with localStorage caching.
 *
 * 1. Check localStorage for cached valid entries
 * 2. Only fetch uncached/expired addresses from API
 * 3. Save new results to localStorage
 * 4. Return combined results
 */
export async function fetchEthosData(
  addresses: string[]
): Promise<Record<string, EthosData>> {
  if (addresses.length === 0) return {};

  // Normalize addresses
  const normalizedAddresses = addresses.map((a) => a.toLowerCase());

  // Check cache first
  const cached = getMultipleEthosDataFromCache(normalizedAddresses);
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
  const freshData: Record<string, EthosData> = {};

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      "https://api.ethos.network/api/v2/score/addresses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addresses: uncachedAddresses }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      // Process the response data based on API structure
      if (typeof data === "object" && data !== null) {
        Object.keys(data).forEach((address) => {
          const scoreData = data[address];

          if (scoreData && typeof scoreData === "object") {
            const score = scoreData.score;
            const level = scoreData.level;

            if (score !== undefined) {
              freshData[address.toLowerCase()] = {
                score: score,
                level: level,
              };
            }
          }
        });
      }
      // Save fresh data to cache
      if (Object.keys(freshData).length > 0) {
        saveEthosDataToCache(freshData);
      }
    } else {
      // Silently handle non-ok responses - Ethos data is optional
      console.debug(
        "Ethos API response not ok:",
        response.status,
        response.statusText
      );
    }
  } catch (err) {
    // Silently handle network errors - Ethos data is optional, not critical
    // Only log in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.debug("Ethos API fetch error (non-critical):", err);
    }
  }

  // Combine cached and fresh results - return what we have even if API failed
  return { ...cached, ...freshData };
}
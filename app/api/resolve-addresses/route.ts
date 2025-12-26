import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, type Hex } from "viem";
import { mainnet, base } from "viem/chains";
import { normalize } from "viem/ens";
import { connectDB } from "@/lib/mongoose";
import {
  ResolvedAddress,
  type IResolvedAddress,
  type ResolvedType,
} from "@/models/resolvedAddress";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Cache expiry in days.
 * Cached results older than this will be re-fetched from external services.
 * Adjust this value to control cache freshness vs API call frequency.
 */
const CACHE_EXPIRY_DAYS = 2;

// Convert to milliseconds for comparison
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// ============================================================================
// EXTERNAL SERVICE CLIENTS
// ============================================================================

// Mainnet client for ENS resolution
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
});

// Base client for Basename resolution (.base.eth)
const baseClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"
  ),
});

// Neynar API configuration
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_API_BASE_URL = "https://api.neynar.com";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
}

interface ResolvedAddressResponse {
  displayName: string;
  avatarUrl: string | null;
  resolvedType: ResolvedType;
}

// ============================================================================
// RESOLUTION FUNCTIONS
// ============================================================================

/**
 * Resolve Farcaster usernames for multiple addresses using Neynar bulk API.
 * Returns a map of address -> user data for addresses that have Farcaster profiles.
 */
async function resolveFarcasterBulk(
  addresses: string[]
): Promise<Map<string, { username: string; avatarUrl: string | null }>> {
  const result = new Map<
    string,
    { username: string; avatarUrl: string | null }
  >();

  if (!NEYNAR_API_KEY || addresses.length === 0) {
    return result;
  }

  try {
    // Neynar bulk lookup by address - supports comma-separated addresses
    const addressList = addresses.join(",");
    const response = await fetch(
      `${NEYNAR_API_BASE_URL}/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(
        addressList
      )}`,
      {
        headers: {
          "Content-Type": "application/json",
          api_key: NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Neynar API error:", response.status, response.statusText);
      return result;
    }

    const data = await response.json();

    // Response format: { [address]: [array of users] }
    // We take the first user for each address (primary profile)
    for (const [address, users] of Object.entries(data)) {
      const userArray = users as NeynarUser[];
      if (userArray && userArray.length > 0) {
        const user = userArray[0];
        result.set(address.toLowerCase(), {
          username: user.username,
          avatarUrl: user.pfp_url || null,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching Farcaster data:", error);
  }

  return result;
}

/**
 * Resolve Basename (.base.eth) for a single address.
 * Basenames are ENS names on Base L2.
 */
async function resolveBasename(
  address: string
): Promise<{ name: string; avatarUrl: string | null } | null> {
  try {
    const name = await baseClient.getEnsName({
      address: address as Hex,
      universalResolverAddress: "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD",
    });

    if (name) {
      // Try to get avatar for the basename
      let avatarUrl: string | null = null;
      try {
        avatarUrl = await baseClient.getEnsAvatar({
          name: normalize(name),
          universalResolverAddress:
            "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD",
        });
      } catch {
        // Avatar fetch failed, continue without it
      }
      return { name, avatarUrl };
    }
  } catch {
    // Basename resolution failed
  }

  return null;
}

/**
 * Resolve primary ENS name for a single address on mainnet.
 */
async function resolveEns(
  address: string
): Promise<{ name: string; avatarUrl: string | null } | null> {
  try {
    const name = await mainnetClient.getEnsName({
      address: address as Hex,
    });

    if (name) {
      // Try to get avatar for the ENS name
      let avatarUrl: string | null = null;
      try {
        avatarUrl = await mainnetClient.getEnsAvatar({
          name: normalize(name),
        });
      } catch {
        // Avatar fetch failed, continue without it
      }
      return { name, avatarUrl };
    }
  } catch {
    // ENS resolution failed
  }

  return null;
}

/**
 * Resolve a single address through all resolution methods in priority order.
 * Priority: Farcaster -> Basename -> ENS
 */
async function resolveAddress(
  address: string,
  farcasterData: Map<string, { username: string; avatarUrl: string | null }>
): Promise<ResolvedAddressResponse | undefined> {
  const normalizedAddress = address.toLowerCase();

  // 1. Check Farcaster (already fetched in bulk)
  const farcaster = farcasterData.get(normalizedAddress);
  if (farcaster) {
    return {
      displayName: farcaster.username,
      avatarUrl: farcaster.avatarUrl,
      resolvedType: "farcaster",
    };
  }

  // 2. Try Basename (.base.eth)
  const basename = await resolveBasename(address);
  if (basename) {
    return {
      displayName: basename.name,
      avatarUrl: basename.avatarUrl,
      resolvedType: "basename",
    };
  }

  // 3. Try ENS
  const ens = await resolveEns(address);
  if (ens) {
    return {
      displayName: ens.name,
      avatarUrl: ens.avatarUrl,
      resolvedType: "ens",
    };
  }

  // No resolution found
  return undefined;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses } = body;

    // Validate input
    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: "Invalid input: addresses must be an array" },
        { status: 400 }
      );
    }

    if (addresses.length === 0) {
      return NextResponse.json([]);
    }

    // Limit batch size to prevent abuse
    if (addresses.length > 100) {
      return NextResponse.json(
        { error: "Too many addresses: maximum 100 per request" },
        { status: 400 }
      );
    }

    // Normalize all addresses to lowercase
    const normalizedAddresses = addresses.map((addr: string) =>
      addr.toLowerCase()
    );

    await connectDB();

    // ========================================================================
    // STEP 1: Check cache for all addresses
    // ========================================================================
    const now = new Date();
    const cacheExpiryDate = new Date(now.getTime() - CACHE_EXPIRY_MS);

    const cachedResults = await ResolvedAddress.find({
      address: { $in: normalizedAddresses },
      resolvedAt: { $gte: cacheExpiryDate },
    }).lean();

    // Build map of cached results
    const cachedMap = new Map<string, IResolvedAddress>();
    for (const cached of cachedResults) {
      cachedMap.set(cached.address, cached);
    }

    // Find addresses that need fresh resolution
    const addressesToResolve = normalizedAddresses.filter(
      (addr: string) => !cachedMap.has(addr)
    );

    // ========================================================================
    // STEP 2: Resolve uncached addresses
    // ========================================================================
    const freshResults = new Map<string, ResolvedAddressResponse | undefined>();

    if (addressesToResolve.length > 0) {
      // Batch fetch Farcaster data for all addresses at once
      const farcasterData = await resolveFarcasterBulk(addressesToResolve);

      // Resolve remaining addresses in parallel
      const resolutionPromises = addressesToResolve.map(
        async (addr: string) => {
          const result = await resolveAddress(addr, farcasterData);
          return { address: addr, result };
        }
      );

      const resolutions = await Promise.allSettled(resolutionPromises);

      for (const resolution of resolutions) {
        if (resolution.status === "fulfilled") {
          const { address: addr, result } = resolution.value;
          freshResults.set(addr, result);
        }
      }

      // ======================================================================
      // STEP 3: Update cache with fresh results
      // ======================================================================
      const cacheUpdates: Promise<unknown>[] = [];

      for (const [addr, result] of freshResults) {
        if (result) {
          cacheUpdates.push(
            ResolvedAddress.findOneAndUpdate(
              { address: addr },
              {
                address: addr,
                displayName: result.displayName,
                avatarUrl: result.avatarUrl,
                resolvedType: result.resolvedType,
                resolvedAt: now,
              },
              { upsert: true, new: true }
            )
          );
        }
      }

      // Execute cache updates in parallel (non-blocking)
      Promise.allSettled(cacheUpdates).catch((err) => {
        console.error("Error updating cache:", err);
      });
    }

    // ========================================================================
    // STEP 4: Build response maintaining input order
    // ========================================================================
    const response: (ResolvedAddressResponse | undefined)[] =
      normalizedAddresses.map((addr: string) => {
        // Check fresh results first
        if (freshResults.has(addr)) {
          return freshResults.get(addr);
        }

        // Check cached results
        const cached = cachedMap.get(addr);
        if (cached) {
          return {
            displayName: cached.displayName,
            avatarUrl: cached.avatarUrl,
            resolvedType: cached.resolvedType,
          };
        }

        // Not resolved
        return undefined;
      });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error resolving addresses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

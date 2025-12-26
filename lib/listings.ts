"use client";

import { featuredApps } from "@/data/featuredApps";
import { fetchEthosScores } from "@/lib/ethos-scores";

// ============================================================================
// TYPES
// ============================================================================

export interface Listing {
  slug: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  appId?: string;
  appName?: string;
  appIconUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invite {
  app: string;
  appIconUrl?: string;
  description: string;
  price: string;
  priceUsdc: number;
  seller: string;
  ethos: number | null;
  gradientFrom: string;
  gradientTo: string;
  slug: string;
  sellerAddress: string;
  createdAt: string;
}

export interface ListingsData {
  invites: Invite[];
  rawListings: Listing[];
}

// ============================================================================
// GRADIENT HELPERS
// ============================================================================

export const GRADIENTS = [
  { from: "#6366f1", to: "#8b5cf6" },
  { from: "#06b6d4", to: "#3b82f6" },
  { from: "#10b981", to: "#06b6d4" },
  { from: "#f59e0b", to: "#ef4444" },
  { from: "#ec4899", to: "#8b5cf6" },
  { from: "#f43f5e", to: "#fb923c" },
  { from: "#8b5cf6", to: "#06b6d4" },
  { from: "#84cc16", to: "#22c55e" },
];

function hashString(str: string): number {
  let hash = 0;
  const normalizedStr = str.toLowerCase().trim();
  for (let i = 0; i < normalizedStr.length; i++) {
    const char = normalizedStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getGradientForApp(appName: string): {
  from: string;
  to: string;
} {
  const hash = hashString(appName);
  return GRADIENTS[hash % GRADIENTS.length];
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

function transformListing(listing: Listing): Invite {
  let host = "App";

  if (listing.appId) {
    const featuredApp = featuredApps.find((app) => app.id === listing.appId);
    if (featuredApp) {
      host = featuredApp.appName;
    } else {
      host = listing.appId;
    }
  } else if (listing.appName) {
    host = listing.appName;
  }

  const gradient = getGradientForApp(host);
  const shortAddr = `${listing.sellerAddress.slice(
    0,
    6
  )}…${listing.sellerAddress.slice(-4)}`;

  return {
    app: host.charAt(0).toUpperCase() + host.slice(1),
    appIconUrl: listing.appIconUrl,
    description: `Early access invite to ${host}`,
    price: `$${listing.priceUsdc}`,
    priceUsdc: listing.priceUsdc,
    seller: shortAddr,
    ethos: null,
    gradientFrom: gradient.from,
    gradientTo: gradient.to,
    slug: listing.slug,
    sellerAddress: listing.sellerAddress,
    createdAt: listing.createdAt,
  };
}

// ============================================================================
// FETCH FUNCTION (SHARED ACROSS ALL PAGES)
// ============================================================================

/**
 * Fetch listings data with Ethos scores.
 * This is the single source of truth for the TanStack Query cache.
 * All pages should use this function to ensure cache consistency.
 */
export async function fetchListingsData(): Promise<ListingsData> {
  const response = await fetch("/api/listings");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch listings");
  }

  const listings: Listing[] = data.listings || [];
  const active = listings.filter((l) => l.status === "active");
  const transformedInvites = active.map(transformListing);

  const uniqueAddresses = [
    ...new Set(transformedInvites.map((invite) => invite.sellerAddress)),
  ];

  const scoreMap = await fetchEthosScores(uniqueAddresses);

  const invitesWithScores = transformedInvites.map((invite) => ({
    ...invite,
    ethos: scoreMap[invite.sellerAddress.toLowerCase()] ?? null,
  }));

  return { invites: invitesWithScores, rawListings: active };
}


"use client";

import { featuredApps } from "@/data/featuredApps";
import { fetchEthosData, type EthosData } from "@/lib/ethos-scores";

// ============================================================================
// TYPES
// ============================================================================

export type ListingType = "invite_link" | "access_code";

export interface Listing {
  slug: string;
  listingType?: ListingType;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  appId?: string;
  appName?: string;
  appUrl?: string; // For access_code type - public URL
  appIconUrl?: string;
  iconNeedsDarkBg?: boolean; // Whether the icon needs a dark background (e.g., white icons)
  // Multi-use listing fields
  maxUses?: number; // Maximum purchases allowed (-1 for unlimited, default: 1)
  purchaseCount?: number; // Current number of purchases (default: 0)
  description?: string; // Optional description for the listing
  createdAt: string;
  updatedAt: string;
}

export interface Invite {
  app: string;
  appIconUrl?: string;
  iconNeedsDarkBg?: boolean; // Whether the icon needs a dark background
  description: string;
  price: string;
  priceUsdc: number;
  seller: string;
  ethosData: EthosData | null;
  gradientFrom: string;
  gradientTo: string;
  slug: string;
  sellerAddress: string;
  // Multi-use inventory info
  maxUses: number; // -1 for unlimited
  purchaseCount: number;
  remainingUses: number | null; // null for unlimited
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

/**
 * Checks if a listing is available for purchase.
 * A listing is available if status is "active" AND has remaining inventory.
 */
export function isListingAvailable(listing: {
  status: string;
  maxUses?: number;
  purchaseCount?: number;
}): boolean {
  if (listing.status !== "active") return false;

  const maxUses = listing.maxUses ?? 1;
  const purchaseCount = listing.purchaseCount ?? 0;

  // -1 means unlimited
  if (maxUses === -1) return true;

  return purchaseCount < maxUses;
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

  // Multi-use inventory calculations
  const maxUses = listing.maxUses ?? 1;
  const purchaseCount = listing.purchaseCount ?? 0;
  const remainingUses = maxUses === -1 ? null : maxUses - purchaseCount;

  return {
    app: host.charAt(0).toUpperCase() + host.slice(1),
    appIconUrl: listing.appIconUrl,
    iconNeedsDarkBg: listing.iconNeedsDarkBg,
    description: `Early access invite to ${host}`,
    price: `$${listing.priceUsdc}`,
    priceUsdc: listing.priceUsdc,
    seller: shortAddr,
    ethosData: null,
    gradientFrom: gradient.from,
    gradientTo: gradient.to,
    slug: listing.slug,
    sellerAddress: listing.sellerAddress,
    maxUses,
    purchaseCount,
    remainingUses,
    createdAt: listing.createdAt,
  };
}

// ============================================================================
// FETCH FUNCTION (SHARED ACROSS ALL PAGES)
// ============================================================================

/**
 * Fetch listings data with Ethos scores and trust levels.
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
  // Filter to only show listings with remaining inventory
  const available = listings.filter((l) => isListingAvailable(l));
  const transformedInvites = available.map(transformListing);

  // Only fetch Ethos data if there are active listings
  let ethosDataMap: Record<string, EthosData> = {};
  if (transformedInvites.length > 0) {
    const uniqueAddresses = [
      ...new Set(transformedInvites.map((invite) => invite.sellerAddress)),
    ];
    ethosDataMap = await fetchEthosData(uniqueAddresses);
  }

  const invitesWithEthosData = transformedInvites.map((invite) => ({
    ...invite,
    ethosData: ethosDataMap[invite.sellerAddress.toLowerCase()] ?? null,
  }));

  return { invites: invitesWithEthosData, rawListings: available };
}
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import NProgress from "nprogress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { featuredApps } from "@/data/featuredApps";
import { timeAgo } from "@/lib/time";
import {
  useResolveAddresses,
  getSellerDisplayInfo,
} from "@/lib/resolve-addresses";
import { usePurchase, LISTINGS_QUERY_KEY } from "@/hooks/usePurchase";
import { PaymentSuccessModal } from "@/app/components/PaymentSuccessModal";
import { QuickBuyButton } from "@/app/components/QuickBuyButton";
import {
  RefreshIndicator,
  AUTO_REFRESH_INTERVAL,
} from "@/app/components/RefreshIndicator";
import { PriceChart } from "@/app/components/PriceChart";
import { fetchEthosData, type EthosData } from "@/lib/ethos-scores";
import {
  fetchListingsData,
  getGradientForApp,
  GRADIENTS,
  type Listing,
  type ListingsData,
} from "@/lib/listings";
import { blo } from "blo";

/* ---------- App Data Types ---------- */

interface AppData {
  id: string;
  name: string;
  iconUrl: string;
  description: string;
  siteUrl?: string;
  totalListings: number;
  activeListings: number;
  lowestPrice: number | null;
  isFeatured: boolean;
}

interface AppsResponse {
  success: boolean;
  apps: AppData[];
}

/* ---------- Types ---------- */

interface ListingWithEthos extends Listing {
  ethosData: EthosData | null;
}

interface SaleData {
  timestamp: string;
  priceUsdc: number;
  slug: string;
}

type SortField = "price" | "date" | "ethos";
type SortDirection = "asc" | "desc";

/* ---------- Helper Functions ---------- */

// Helper function to get trust level color and label
function getTrustLevelConfig(level: string) {
  const normalizedLevel = level.toLowerCase();

  switch (normalizedLevel) {
    case "trusted":
      return {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        dot: "bg-emerald-400",
        label: "Trusted",
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

/* ---------- Sort Icon Component ---------- */

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    // Show both arrows faded when not active
    return (
      <svg
        className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-500 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }

  // Show single arrow in active direction
  return (
    <svg
      className="w-3.5 h-3.5 text-cyan-400 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {direction === "asc" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      )}
    </svg>
  );
}

export default function AppPageClient() {
  const params = useParams<{ slug: string }>();
  // Decode the slug in case it's URL-encoded (e.g., "Base%20App" -> "Base App")
  const slug = params.slug ? decodeURIComponent(params.slug) : "";
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sortField, setSortField] = useState<SortField>("price");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);
  const [ethosDataMap, setEthosDataMap] = useState<Record<string, EthosData>>(
    {}
  );
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);

  // TanStack Query for listings - shares cache with homepage
  const {
    data: listingsData,
    isLoading: loading,
    error: queryError,
    isFetching: isRefreshing,
    dataUpdatedAt,
    refetch,
  } = useQuery<ListingsData>({
    queryKey: LISTINGS_QUERY_KEY,
    queryFn: fetchListingsData,
    staleTime: AUTO_REFRESH_INTERVAL * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch all apps to get info for non-featured apps
  const { data: appsData, isLoading: appsLoading } = useQuery<AppsResponse>({
    queryKey: ["apps"],
    queryFn: async () => {
      const response = await fetch("/api/apps");
      if (!response.ok) throw new Error("Failed to fetch apps");
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });

  const { data: salesData, isLoading: salesLoading } = useQuery<SaleData[]>({
    queryKey: ["sales", slug],
    queryFn: async () => {
      const response = await fetch(`/api/sales/${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error("Failed to fetch sales");
      return response.json();
    },
    staleTime: AUTO_REFRESH_INTERVAL * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!slug,
  });

  const error = queryError instanceof Error ? queryError.message : "";

  // Memoize allListings to ensure stable reference
  const allListings = useMemo(
    () => listingsData?.rawListings ?? [],
    [listingsData?.rawListings]
  );

  // Filter listings for this specific app - match by appId OR appName
  const appListings = useMemo(() => {
    return allListings.filter((l) => l.appId === slug || l.appName === slug);
  }, [allListings, slug]);

  // Get app info from /api/apps for non-featured apps (works even with no active listings)
  const appDataFromApi = useMemo(() => {
    if (!appsData?.apps) return null;
    return appsData.apps.find((app) => app.id === slug) || null;
  }, [appsData, slug]);

  // Get app info from listings as fallback
  const appInfoFromListings = useMemo(() => {
    if (appListings.length > 0) {
      const firstListing = appListings[0];
      return {
        name: firstListing.appName || slug,
        iconUrl: firstListing.appIconUrl || null,
      };
    }
    return null;
  }, [appListings, slug]);

  // Combined app info - prefer API data, fallback to listings
  const appInfo = useMemo(() => {
    if (appDataFromApi) {
      return {
        name: appDataFromApi.name,
        iconUrl: appDataFromApi.iconUrl,
        description: appDataFromApi.description,
        siteUrl: appDataFromApi.siteUrl,
      };
    }
    return appInfoFromListings;
  }, [appDataFromApi, appInfoFromListings]);

  // Toggle sort - if same field, toggle direction; if different field, set new field with default direction
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // Default directions: price=asc (cheapest), date=desc (newest), ethos=desc (highest)
      setSortDirection(field === "price" ? "asc" : "desc");
    }
  };

  const {
    purchase,
    isPending,
    purchaseData,
    purchasedSellerAddress,
    showSuccessModal,
    closeSuccessModal,
  } = usePurchase();

  // Check if this is a featured app
  const featuredApp = useMemo(
    () => featuredApps.find((a) => a.id === slug),
    [slug]
  );

  const gradient = useMemo(
    () =>
      featuredApp
        ? getGradientForApp(featuredApp.appName)
        : appInfo
        ? getGradientForApp(appInfo.name)
        : GRADIENTS[0],
    [featuredApp, appInfo]
  );

  // Listings with Ethos data
  const listings: ListingWithEthos[] = useMemo(() => {
    const result = appListings.map((l) => ({
      ...l,
      ethosData: ethosDataMap[l.sellerAddress.toLowerCase()] ?? null,
    }));
    console.log("Listings with ethos data:", result);
    return result;
  }, [appListings, ethosDataMap]);

  // Get seller addresses for resolution
  const sellerAddresses = useMemo(
    () => [...new Set(listings.map((l) => l.sellerAddress))],
    [listings]
  );

  const { resolvedAddresses } = useResolveAddresses(sellerAddresses);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch Ethos data when app listings change
  useEffect(() => {
    if (appListings.length === 0) return;

    const uniqueAddresses = [
      ...new Set(appListings.map((l) => l.sellerAddress)),
    ];

    fetchEthosData(uniqueAddresses).then((data) => {
      console.log("Ethos data received:", data);
      setEthosDataMap(data);
    });
  }, [appListings]);

  // Countdown timer - calculates time since last fetch
  useEffect(() => {
    const updateCountdown = () => {
      if (dataUpdatedAt) {
        const secondsSinceUpdate = Math.floor(
          (Date.now() - dataUpdatedAt) / 1000
        );
        const remaining = Math.max(
          0,
          AUTO_REFRESH_INTERVAL - secondsSinceUpdate
        );
        setCountdown(remaining);

        // Auto-refetch when countdown hits 0
        if (remaining === 0) {
          refetch();
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt, refetch]);

  // Handle manual refresh
  const handleManualRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Sort listings
  const sortedListings = useMemo(() => {
    const sorted = [...listings];
    const multiplier = sortDirection === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortField) {
        case "price":
          return (a.priceUsdc - b.priceUsdc) * multiplier;
        case "date":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            multiplier
          );
        case "ethos":
          if (a.ethosData === null && b.ethosData === null) return 0;
          if (a.ethosData === null) return 1;
          if (b.ethosData === null) return -1;
          return (a.ethosData.score - b.ethosData.score) * multiplier;
        default:
          return 0;
      }
    });

    return sorted;
  }, [listings, sortField, sortDirection]);

  const handleQuickBuy = async (listingSlug: string) => {
    setPurchasingSlug(listingSlug);
    const listing = listings.find((l) => l.slug === listingSlug);
    const result = await purchase(listingSlug, listing?.sellerAddress || "");
    if (result) {
      // Remove the purchased listing from the cache
      queryClient.setQueryData<ListingsData>(LISTINGS_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          invites: old.invites.filter((inv) => inv.slug !== listingSlug),
          rawListings: old.rawListings.filter((l) => l.slug !== listingSlug),
        };
      });
    }
    setPurchasingSlug(null);
  };

  // Determine the display info
  const displayName = featuredApp?.appName || appInfo?.name || slug;
  const displayIconUrl = featuredApp?.appIconUrl || appInfo?.iconUrl;
  const displayDescription =
    featuredApp?.description ||
    (appInfo && "description" in appInfo ? appInfo.description : null);
  const displaySiteUrl =
    featuredApp?.siteUrl ||
    (appInfo && "siteUrl" in appInfo ? appInfo.siteUrl : null);
  const isFeatured = !!featuredApp;

  // Combined loading state - wait for both listings and apps data
  const isPageLoading = loading || appsLoading;

  // 404 if no featured app and no app found in database (after loading)
  if (!isPageLoading && !featuredApp && !appInfo) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 border border-zinc-800 rounded-xl p-10 text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">App Not Found</h2>
          <p className="text-zinc-400 mb-8">
            This app doesn&apos;t exist in our marketplace.
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-blue-500 font-semibold text-black cursor-pointer hover:from-cyan-400 hover:to-blue-400 transition-all"
          >
            Back
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-7xl mx-auto py-6 md:py-8 px-4 md:px-6 lg:px-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - App Info Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 flex"
          >
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex flex-col flex-1">
              {/* Gradient Header Bar */}
              <div
                className="h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
                }}
              />

              {/* Header - Tiled background if icon available, otherwise simple gradient */}
              {displayIconUrl ? (
                /* Tiled Background Header */
                <div className="relative h-32 md:h-40 overflow-hidden bg-zinc-900/50">
                  {/* Tiled pattern */}
                  <div
                    className="absolute inset-0 grid grid-cols-6 gap-4 opacity-[0.12] p-3"
                    style={{
                      transform: "rotate(-15deg) scale(1.5)",
                    }}
                  >
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 flex items-center justify-center"
                      >
                        <div className="w-full h-full bg-white rounded-lg p-1.5 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={displayIconUrl}
                            alt=""
                            className="object-contain w-full h-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${gradient.from}15 0%, ${gradient.to}20 100%)`,
                    }}
                  />

                  {/* Vignette */}
                  <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-zinc-950/50" />
                  <div className="absolute inset-0 bg-linear-to-r from-zinc-950/60 via-transparent to-zinc-950/60" />

                  {/* Main Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-zinc-600 shadow-2xl bg-white p-2 ring-4 ring-black/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayIconUrl}
                        alt={`${displayName} icon`}
                        className="object-contain w-full h-full rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* No icon: Simple gradient header */
                <div
                  className="relative h-24 md:h-28 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}30 0%, ${gradient.to}40 100%)`,
                  }}
                >
                  {/* Vignette */}
                  <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-transparent" />
                </div>
              )}

              {/* App Info */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  {displaySiteUrl ? (
                    <a
                      href={displaySiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 text-2xl md:text-3xl font-bold text-white hover:text-cyan-400 transition-colors"
                    >
                      {displayName}
                      <svg
                        className="w-5 h-5 text-zinc-500 group-hover:text-cyan-400 transition-colors shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  ) : (
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {displayName}
                    </h1>
                  )}
                  {isFeatured && (
                    <span className="shrink-0 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-400">
                      Featured
                    </span>
                  )}
                </div>

                {/* Description */}
                {displayDescription && (
                  <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                    {displayDescription}
                  </p>
                )}

                {/* Stats */}
                <div
                  className={`flex items-center gap-3 ${
                    displayDescription ? "" : "mt-4"
                  } mb-6`}
                >
                  {listings.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-sm font-medium text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {listings.length} active{" "}
                      {listings.length === 1 ? "listing" : "listings"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-sm font-medium text-zinc-400">
                      Sold out
                    </span>
                  )}
                </div>

                {/* CTA */}
                <Link href="/sell" className="mt-auto">
                  <button className="hover-scale w-full py-3 rounded-xl font-semibold text-black bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Sell Your Invite
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Price History Chart */}
          {!salesLoading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-2 flex"
            >
              <PriceChart
                sales={salesData || []}
                gradientFrom={gradient.from}
                gradientTo={gradient.to}
                className="flex-1"
              />
            </motion.div>
          )}

          {/* Listings Table - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                  Available Listings
                </h2>
                {/* Listing count badge */}
                {listings.length > 0 && (
                  <span className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-800 border border-zinc-700 text-sm font-semibold text-white">
                    {listings.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                {/* Mobile Sort Buttons */}
                {listings.length > 0 && (
                  <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
                    <span className="text-xs text-zinc-500">Sort:</span>
                    <div className="flex gap-1">
                      {(["price", "date", "ethos"] as SortField[]).map(
                        (field) => (
                          <button
                            key={field}
                            onClick={() => handleSort(field)}
                            className={`px-1.5 sm:px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-colors cursor-pointer ${
                              sortField === field
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                            }`}
                          >
                            {field === "price"
                              ? "Price"
                              : field === "date"
                              ? "Date"
                              : "Ethos"}
                            {sortField === field && (
                              <span className="ml-0.5 sm:ml-1">
                                {sortDirection === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Auto-refresh countdown */}
                <RefreshIndicator
                  countdown={countdown}
                  isRefreshing={isRefreshing}
                  onRefresh={handleManualRefresh}
                />
              </div>
            </div>

            {/* Loading State */}
            {isPageLoading && (
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                {/* Skeleton Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-zinc-900/50 border-b border-zinc-800">
                  <div className="col-span-3 h-3 w-16 bg-zinc-800 rounded" />
                  <div className="col-span-2 h-3 w-14 bg-zinc-800 rounded" />
                  <div className="col-span-2 h-3 w-20 bg-zinc-800 rounded" />
                  <div className="col-span-2 h-3 w-12 bg-zinc-800 rounded ml-auto" />
                  <div className="col-span-3" />
                </div>

                {/* Skeleton Rows */}
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 border-b border-zinc-800 last:border-b-0 animate-pulse"
                  >
                    {/* Seller */}
                    <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-28 bg-zinc-800 rounded" />
                        <div className="h-3 w-20 bg-zinc-800 rounded" />
                      </div>
                    </div>
                    {/* Listed */}
                    <div className="col-span-1 md:col-span-2 flex items-center">
                      <div className="h-4 w-16 bg-zinc-800 rounded" />
                    </div>
                    {/* Trust Level */}
                    <div className="col-span-1 md:col-span-2 flex items-center">
                      <div className="h-6 w-20 bg-zinc-800 rounded-full" />
                    </div>
                    {/* Price */}
                    <div className="col-span-1 md:col-span-2 flex items-center md:justify-end">
                      <div className="h-5 w-20 bg-zinc-800 rounded" />
                    </div>
                    {/* Actions */}
                    <div className="col-span-1 md:col-span-3 flex items-center gap-2 justify-end">
                      <div className="h-9 w-[100px] bg-zinc-800 rounded-lg" />
                      <div className="h-9 w-16 bg-zinc-800 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl bg-zinc-950 border border-red-500/30 p-8 text-center"
              >
                <p className="text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Empty State */}
            {!isPageLoading && !error && listings.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl bg-zinc-950 border border-zinc-800 p-12 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Sold out
                </h3>
                <p className="text-zinc-400 text-sm mb-6">
                  Be the first to sell an invite for {displayName}!
                </p>
                <Link href="/sell">
                  <button className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer">
                    List Your Invite
                  </button>
                </Link>
              </motion.div>
            )}

            {/* Listings Table */}
            {!isPageLoading && !error && sortedListings.length > 0 && (
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden w-full min-w-0">
                {/* Table Header with Sortable Columns */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-zinc-900/50 border-b border-zinc-800 text-xs font-medium uppercase tracking-wider">
                  <div className="col-span-3 text-zinc-500">Seller</div>
                  <button
                    onClick={() => handleSort("date")}
                    className="col-span-2 flex items-center gap-1 text-left cursor-pointer hover:text-zinc-300 transition-colors group"
                  >
                    <span
                      className={
                        sortField === "date" ? "text-cyan-400" : "text-zinc-500"
                      }
                    >
                      Listed
                    </span>
                    <SortIcon
                      active={sortField === "date"}
                      direction={sortDirection}
                    />
                  </button>
                  <button
                    onClick={() => handleSort("ethos")}
                    className="col-span-2 flex items-center gap-1 text-left cursor-pointer hover:text-zinc-300 transition-colors group"
                  >
                    <span
                      className={
                        sortField === "ethos"
                          ? "text-cyan-400"
                          : "text-zinc-500"
                      }
                    >
                      Trust Level
                    </span>
                    <SortIcon
                      active={sortField === "ethos"}
                      direction={sortDirection}
                    />
                  </button>
                  <button
                    onClick={() => handleSort("price")}
                    className="col-span-2 flex items-center gap-1 justify-end cursor-pointer hover:text-zinc-300 transition-colors group"
                  >
                    <span
                      className={
                        sortField === "price"
                          ? "text-cyan-400"
                          : "text-zinc-500"
                      }
                    >
                      Price
                    </span>
                    <SortIcon
                      active={sortField === "price"}
                      direction={sortDirection}
                    />
                  </button>
                  <div className="col-span-3"></div>
                </div>

                {/* Table Rows */}
                {sortedListings.map((listing, i) => {
                  const sellerInfo = getSellerDisplayInfo(
                    listing.sellerAddress,
                    resolvedAddresses
                  );
                  const trustLevelConfig = listing.ethosData
                    ? getTrustLevelConfig(listing.ethosData.level)
                    : null;

                  return (
                    <motion.div
                      key={listing.slug}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        NProgress.start();
                        router.push(`/listing/${listing.slug}`);
                      }}
                      className="md:grid md:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-4 border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/30 transition-colors cursor-pointer"
                    >
                      {/* Seller - Mobile: Full width row */}
                      <div className="md:col-span-3 flex items-center gap-3 mb-2 md:mb-0">
                        {/* Avatar */}
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              sellerInfo.avatarUrl ||
                              blo(listing.sellerAddress as `0x${string}`)
                            }
                            alt="Seller avatar"
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          {sellerInfo.resolvedType ? (
                            <>
                              <Link
                                href={`/profile/${listing.sellerAddress}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-sm text-white flex items-center gap-1 hover:text-cyan-400 transition-colors"
                              >
                                <span className="truncate">
                                  {sellerInfo.resolvedType === "farcaster" &&
                                    "@"}
                                  {sellerInfo.displayName}
                                </span>
                                {sellerInfo.resolvedType === "farcaster" && (
                                  <Image
                                    src="/farcaster-logo.svg"
                                    alt="Farcaster"
                                    width={12}
                                    height={12}
                                    className="inline-block opacity-60 shrink-0"
                                  />
                                )}
                              </Link>
                              <Link
                                href={`/profile/${listing.sellerAddress}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-zinc-500 font-mono hover:text-zinc-400 transition-colors"
                              >
                                {sellerInfo.shortAddress}
                              </Link>
                            </>
                          ) : (
                            <Link
                              href={`/profile/${listing.sellerAddress}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-sm text-zinc-300 hover:text-cyan-400 transition-colors"
                            >
                              {sellerInfo.shortAddress}
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Listed - Mobile: Show label */}
                      <div className="md:col-span-2 flex items-center mb-1 md:mb-0">
                        <span className="md:hidden text-xs text-zinc-500 mr-2 w-12">
                          Listed:
                        </span>
                        <span className="text-sm text-zinc-400">
                          {timeAgo(listing.createdAt)}
                        </span>
                      </div>

                      {/* Trust Level */}
                      <div className="md:col-span-2 flex items-center mb-1 md:mb-0">
                        <span className="md:hidden text-xs text-zinc-500 mr-2 w-12">
                          Trust:
                        </span>
                        {listing.ethosData ? (
                          <a
                            href={`https://app.ethos.network/profile/${listing.sellerAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full ${
                              trustLevelConfig?.bg || "bg-zinc-800"
                            } border ${
                              trustLevelConfig?.border || "border-zinc-700"
                            } hover:border-opacity-70 transition-colors cursor-pointer`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                trustLevelConfig?.dot || "bg-zinc-400"
                              }`}
                            />
                            <span
                              className={`text-xs font-semibold ${
                                trustLevelConfig?.text || "text-zinc-300"
                              }`}
                            >
                              {listing.ethosData.score}
                            </span>
                            <span
                              className={`text-xs ${
                                trustLevelConfig?.text || "text-zinc-300"
                              } opacity-70`}
                            >
                              {trustLevelConfig?.label ||
                                listing.ethosData.level ||
                                "Unknown"}
                            </span>
                          </a>
                        ) : (
                          <span className="text-sm text-zinc-500">—</span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="md:col-span-2 flex items-center md:justify-end mb-2 md:mb-0">
                        <span className="md:hidden text-xs text-zinc-500 mr-2 w-12">
                          Price:
                        </span>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-base sm:text-lg font-bold text-cyan-400">
                            ${listing.priceUsdc}
                          </span>
                          <span className="text-xs text-zinc-500">USDC</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="md:col-span-3 flex items-center gap-2 justify-end mt-2 md:mt-0 pt-2 md:pt-0 border-t border-zinc-800 md:border-t-0">
                        <QuickBuyButton
                          price={`$${listing.priceUsdc}`}
                          isPending={
                            isPending && purchasingSlug === listing.slug
                          }
                          onBuy={() => handleQuickBuy(listing.slug)}
                          compact
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            NProgress.start();
                            router.push(`/listing/${listing.slug}`);
                          }}
                          className="px-3 py-2 rounded-lg font-medium text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        purchaseData={purchaseData}
        sellerAddress={purchasedSellerAddress}
        onClose={closeSuccessModal}
      />
    </div>
  );
}

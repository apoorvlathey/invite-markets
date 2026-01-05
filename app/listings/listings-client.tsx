"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import NProgress from "nprogress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { fetchEthosData, type EthosData } from "@/lib/ethos-scores";
import {
  fetchListingsData,
  getGradientForApp,
  type Listing,
  type ListingsData,
} from "@/lib/listings";
import { featuredApps } from "@/data/featuredApps";
import { blo } from "blo";

/* ---------- Helper to resolve app name ---------- */

function resolveAppName(listing: Listing): string {
  // Check if it's a featured app by appId
  if (listing.appId) {
    const featuredApp = featuredApps.find((app) => app.id === listing.appId);
    if (featuredApp) {
      return featuredApp.appName;
    }
  }
  // Fall back to appName, then appId, then "App"
  return listing.appName || listing.appId || "App";
}

/* ---------- Types ---------- */

interface AppData {
  id: string;
  name: string;
  iconUrl: string;
  activeListings: number;
}

interface AppsResponse {
  success: boolean;
  apps: AppData[];
}

interface ListingWithEthos extends Listing {
  ethosData: EthosData | null;
}

type SortField = "price" | "date" | "ethos" | "app";
type SortDirection = "asc" | "desc";

/* ---------- Helper Functions ---------- */

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

export default function ListingsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);
  const [ethosDataMap, setEthosDataMap] = useState<Record<string, EthosData>>(
    {}
  );
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // TanStack Query for listings
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

  // Fetch all apps for the filter
  const { data: appsData, isLoading: appsLoading } = useQuery<AppsResponse>({
    queryKey: ["apps"],
    queryFn: async () => {
      const response = await fetch("/api/apps");
      if (!response.ok) throw new Error("Failed to fetch apps");
      return response.json();
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const error = queryError instanceof Error ? queryError.message : "";

  // All raw listings
  const allListings = useMemo(
    () => listingsData?.rawListings ?? [],
    [listingsData?.rawListings]
  );

  // Apps with active listings for filters
  const appsWithListings = useMemo(() => {
    if (!appsData?.apps) return [];
    return appsData.apps.filter((app) => app.activeListings > 0);
  }, [appsData]);

  // Toggle app filter
  const toggleAppFilter = (appId: string) => {
    setSelectedApps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedApps(new Set());
  };

  // Filter listings by selected apps
  const filteredListings = useMemo(() => {
    if (selectedApps.size === 0) return allListings;
    return allListings.filter((l) => l.appId && selectedApps.has(l.appId));
  }, [allListings, selectedApps]);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
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

  // Listings with Ethos data
  const listings: ListingWithEthos[] = useMemo(() => {
    return filteredListings.map((l) => ({
      ...l,
      ethosData: ethosDataMap[l.sellerAddress.toLowerCase()] ?? null,
    }));
  }, [filteredListings, ethosDataMap]);

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

  // Fetch Ethos data when listings change
  useEffect(() => {
    if (allListings.length === 0) return;

    const uniqueAddresses = [
      ...new Set(allListings.map((l) => l.sellerAddress)),
    ];

    fetchEthosData(uniqueAddresses).then((data) => {
      setEthosDataMap(data);
    });
  }, [allListings]);

  // Countdown timer
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

        if (remaining === 0) {
          refetch();
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt, refetch]);

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
        case "app":
          const appA = a.appName || a.appId || "";
          const appB = b.appName || b.appId || "";
          return appA.localeCompare(appB) * multiplier;
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

  const isPageLoading = loading || appsLoading;

  return (
    <div className="min-h-screen text-zinc-100">
      {/* Hero Section */}
      <section className="relative pt-16 md:pt-20 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
              <Link href="/" className="hover:text-zinc-300 transition-colors">
                Home
              </Link>
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-zinc-300">All Listings</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="text-white">Browse </span>
              <span className="bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                All Listings
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl">
              Discover and buy invite codes to the hottest web3 apps.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 pb-24 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Filters */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:w-64 shrink-0"
          >
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 mb-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left cursor-pointer"
            >
              <span className="font-medium text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filters
                {selectedApps.size > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">
                    {selectedApps.size}
                  </span>
                )}
              </span>
              <svg
                className={`w-5 h-5 text-zinc-400 transition-transform ${
                  showMobileFilters ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Filter Panel */}
            <div
              className={`${
                showMobileFilters ? "block" : "hidden"
              } lg:block rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden`}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-semibold text-white">Filter by App</h3>
                {selectedApps.size > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* App List */}
              <div className="p-3 max-h-[400px] overflow-y-auto">
                {appsLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 animate-pulse"
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                        <div className="flex-1">
                          <div className="h-4 w-24 bg-zinc-800 rounded" />
                        </div>
                        <div className="h-5 w-8 bg-zinc-800 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : appsWithListings.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    No apps with active listings
                  </p>
                ) : (
                  <div className="space-y-1">
                    {appsWithListings.map((app) => {
                      const isSelected = selectedApps.has(app.id);
                      const gradient = getGradientForApp(app.name);

                      return (
                        <button
                          key={app.id}
                          onClick={() => toggleAppFilter(app.id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? "bg-zinc-800 border border-zinc-700"
                              : "hover:bg-zinc-900 border border-transparent"
                          }`}
                        >
                          {/* App Icon */}
                          <div
                            className="w-8 h-8 rounded-lg overflow-hidden border shrink-0 bg-white p-0.5"
                            style={{
                              borderColor: isSelected
                                ? gradient.from
                                : "rgb(63 63 70)",
                            }}
                          >
                            <Image
                              src={app.iconUrl}
                              alt={app.name}
                              width={28}
                              height={28}
                              className="w-full h-full object-contain rounded-md"
                              unoptimized
                            />
                          </div>

                          {/* App Name */}
                          <span
                            className={`flex-1 text-left text-sm font-medium truncate ${
                              isSelected ? "text-white" : "text-zinc-400"
                            }`}
                          >
                            {app.name}
                          </span>

                          {/* Count Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isSelected
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {app.activeListings}
                          </span>

                          {/* Checkbox */}
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-cyan-500 border-cyan-500"
                                : "border-zinc-600"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Content - Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            {/* Header */}
            <div className="space-y-3 mb-6">
              {/* Title Row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {selectedApps.size > 0
                      ? `Filtered Listings`
                      : "All Listings"}
                  </h2>
                  {!isPageLoading && (
                    <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm font-medium">
                      {sortedListings.length}{" "}
                      {sortedListings.length === 1 ? "listing" : "listings"}
                    </span>
                  )}
                </div>

                <RefreshIndicator
                  countdown={countdown}
                  isRefreshing={isRefreshing}
                  onRefresh={handleManualRefresh}
                />
              </div>

              {/* Mobile Sort Row */}
              {sortedListings.length > 0 && (
                <div className="flex lg:hidden items-center gap-2">
                  <span className="text-xs text-zinc-500">Sort:</span>
                  <div className="flex gap-1 flex-wrap">
                    {(["price", "date", "ethos"] as SortField[]).map(
                      (field) => (
                        <button
                          key={field}
                          onClick={() => handleSort(field)}
                          className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
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
                            <span className="ml-1">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Loading State */}
            {isPageLoading && (
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                {/* Desktop Loading Header */}
                <div className="hidden lg:grid grid-cols-[minmax(120px,1.5fr)_minmax(150px,2fr)_minmax(80px,1fr)_minmax(140px,1.5fr)_minmax(80px,1fr)_minmax(180px,auto)] gap-4 px-5 py-3 bg-zinc-900/50 border-b border-zinc-800">
                  <div className="h-3 w-12 bg-zinc-800 rounded" />
                  <div className="h-3 w-16 bg-zinc-800 rounded" />
                  <div className="h-3 w-14 bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                  <div className="h-3 w-12 bg-zinc-800 rounded" />
                  <div />
                </div>

                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="border-b border-zinc-800 last:border-b-0 animate-pulse"
                  >
                    {/* Desktop Loading Row */}
                    <div className="hidden lg:grid grid-cols-[minmax(120px,1.5fr)_minmax(150px,2fr)_minmax(80px,1fr)_minmax(140px,1.5fr)_minmax(80px,1fr)_minmax(180px,auto)] gap-4 px-5 py-4 items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 shrink-0" />
                        <div className="h-4 w-16 bg-zinc-800 rounded" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-28 bg-zinc-800 rounded" />
                          <div className="h-3 w-20 bg-zinc-800 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="h-4 w-16 bg-zinc-800 rounded" />
                      </div>
                      <div className="flex items-center">
                        <div className="h-6 w-24 bg-zinc-800 rounded-full" />
                      </div>
                      <div className="flex items-center">
                        <div className="h-5 w-14 bg-zinc-800 rounded" />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <div className="h-9 w-[100px] bg-zinc-800 rounded-lg" />
                        <div className="h-9 w-16 bg-zinc-800 rounded-lg" />
                      </div>
                    </div>

                    {/* Mobile Loading Card */}
                    <div className="lg:hidden p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-24 bg-zinc-800 rounded" />
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0" />
                            <div className="h-3 w-20 bg-zinc-800 rounded" />
                          </div>
                        </div>
                      </div>
                      <div className="h-4 w-32 bg-zinc-800 rounded" />
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-12 bg-zinc-800 rounded" />
                        <div className="h-6 w-24 bg-zinc-800 rounded-full" />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                        <div className="h-6 w-16 bg-zinc-800 rounded" />
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-[90px] bg-zinc-800 rounded-lg" />
                          <div className="h-9 w-16 bg-zinc-800 rounded-lg" />
                        </div>
                      </div>
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
            {!isPageLoading && !error && sortedListings.length === 0 && (
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
                  {selectedApps.size > 0
                    ? "No listings match your filters"
                    : "No listings available"}
                </h3>
                <p className="text-zinc-400 text-sm mb-6">
                  {selectedApps.size > 0
                    ? "Try adjusting your filters or check back later."
                    : "Be the first to list an invite!"}
                </p>
                {selectedApps.size > 0 ? (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <Link href="/sell">
                    <button className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-linear-to-r from-cyan-500 to-blue-500 text-black hover:from-cyan-400 hover:to-blue-400 transition-all cursor-pointer">
                      Create Listing
                    </button>
                  </Link>
                )}
              </motion.div>
            )}

            {/* Listings Table */}
            {!isPageLoading && !error && sortedListings.length > 0 && (
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                {/* Table Header - Desktop Only */}
                <div className="hidden lg:grid grid-cols-[minmax(120px,1.5fr)_minmax(150px,2fr)_minmax(80px,1fr)_minmax(140px,1.5fr)_minmax(80px,1fr)_minmax(180px,auto)] gap-4 px-5 py-3 bg-zinc-900/50 border-b border-zinc-800 text-xs font-medium uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("app")}
                    className="flex items-center gap-1 text-left cursor-pointer hover:text-zinc-300 transition-colors group"
                  >
                    <span
                      className={
                        sortField === "app" ? "text-cyan-400" : "text-zinc-500"
                      }
                    >
                      App
                    </span>
                    <SortIcon
                      active={sortField === "app"}
                      direction={sortDirection}
                    />
                  </button>
                  <div className="text-zinc-500">Seller</div>
                  <button
                    onClick={() => handleSort("date")}
                    className="flex items-center gap-1 text-left cursor-pointer hover:text-zinc-300 transition-colors group"
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
                    className="flex items-center gap-1 text-left cursor-pointer hover:text-zinc-300 transition-colors group"
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
                    className="flex items-center gap-1 cursor-pointer hover:text-zinc-300 transition-colors group"
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
                  <div></div>
                </div>

                {/* Table Rows */}
                {sortedListings.map((listing) => {
                  const sellerInfo = getSellerDisplayInfo(
                    listing.sellerAddress,
                    resolvedAddresses
                  );
                  const trustLevelConfig = listing.ethosData
                    ? getTrustLevelConfig(listing.ethosData.level)
                    : null;
                  const appName = resolveAppName(listing);
                  const gradient = getGradientForApp(appName);

                  return (
                    <div
                      key={listing.slug}
                      onClick={() => {
                        NProgress.start();
                        router.push(`/listing/${listing.slug}`);
                      }}
                      className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/30 transition-colors cursor-pointer"
                    >
                      {/* Desktop Row */}
                      <div className="hidden lg:grid grid-cols-[minmax(120px,1.5fr)_minmax(150px,2fr)_minmax(80px,1fr)_minmax(140px,1.5fr)_minmax(80px,1fr)_minmax(180px,auto)] gap-4 px-5 py-4 items-center">
                        {/* App */}
                        <div className="flex items-center gap-2 min-w-0">
                          {listing.appIconUrl ? (
                            <div
                              className="w-8 h-8 rounded-lg overflow-hidden border shrink-0 bg-white p-0.5"
                              style={{ borderColor: gradient.from }}
                            >
                              <Image
                                src={listing.appIconUrl}
                                alt={appName}
                                width={28}
                                height={28}
                                className="w-full h-full object-contain rounded-md"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div
                              className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-sm"
                              style={{
                                background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                              }}
                            >
                              {appName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <Link
                            href={`/app/${encodeURIComponent(
                              listing.appId || appName
                            )}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-sm text-white hover:text-cyan-400 transition-colors truncate"
                          >
                            {appName}
                          </Link>
                        </div>

                        {/* Seller */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-zinc-700">
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

                          <div className="min-w-0">
                            {sellerInfo.resolvedType ? (
                              <>
                                <Link
                                  href={`/profile/${listing.sellerAddress}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-medium text-sm text-white flex items-center gap-1 hover:text-cyan-400 transition-colors truncate"
                                >
                                  {sellerInfo.resolvedType === "farcaster" &&
                                    "@"}
                                  {sellerInfo.displayName}
                                  {sellerInfo.resolvedType === "farcaster" && (
                                    <Image
                                      src="/farcaster-logo.svg"
                                      alt="Farcaster"
                                      width={12}
                                      height={12}
                                      className="inline-block opacity-60"
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

                        {/* Listed */}
                        <div className="flex items-center">
                          <span className="text-sm text-zinc-400">
                            {timeAgo(listing.createdAt)}
                          </span>
                        </div>

                        {/* Trust Level */}
                        <div className="flex items-center">
                          {listing.ethosData ? (
                            <a
                              href={`https://app.ethos.network/profile/${listing.sellerAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
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

                        {/* Price & Stock */}
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-cyan-400">
                            ${listing.priceUsdc}
                          </span>
                          {/* Inventory Badge - only show for multi-use listings */}
                          {(() => {
                            const maxUses = listing.maxUses ?? 1;
                            const purchaseCount = listing.purchaseCount ?? 0;
                            const isUnlimited = maxUses === -1;
                            const remaining = isUnlimited ? null : maxUses - purchaseCount;
                            // Only show badge for multi-use or unlimited listings
                            if (!isUnlimited && maxUses <= 1) return null;
                            return (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                isUnlimited
                                  ? "bg-blue-500/20 text-blue-400"
                                  : remaining === 1
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-zinc-800 text-zinc-400"
                              }`}>
                                {isUnlimited ? `∞` : `${remaining} left`}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 justify-end">
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
                      </div>

                      {/* Mobile Card */}
                      <div className="lg:hidden p-4 space-y-3">
                        {/* App & Seller Row */}
                        <div className="flex items-start gap-3">
                          {listing.appIconUrl ? (
                            <div
                              className="w-10 h-10 rounded-lg overflow-hidden border shrink-0 bg-white p-0.5"
                              style={{ borderColor: gradient.from }}
                            >
                              <Image
                                src={listing.appIconUrl}
                                alt={appName}
                                width={36}
                                height={36}
                                className="w-full h-full object-contain rounded-md"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-base"
                              style={{
                                background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                              }}
                            >
                              {appName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/app/${encodeURIComponent(
                                listing.appId || appName
                              )}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-white hover:text-cyan-400 transition-colors block truncate"
                            >
                              {appName}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={
                                    sellerInfo.avatarUrl ||
                                    blo(listing.sellerAddress as `0x${string}`)
                                  }
                                  alt="Seller avatar"
                                  width={24}
                                  height={24}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Link
                                href={`/profile/${listing.sellerAddress}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-zinc-400 hover:text-cyan-400 transition-colors truncate"
                              >
                                {sellerInfo.resolvedType
                                  ? `${
                                      sellerInfo.resolvedType === "farcaster"
                                        ? "@"
                                        : ""
                                    }${sellerInfo.displayName}`
                                  : sellerInfo.shortAddress}
                              </Link>
                            </div>
                          </div>
                        </div>

                        {/* Meta Row */}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-zinc-500">
                            Listed:{" "}
                            <span className="text-zinc-400">
                              {timeAgo(listing.createdAt)}
                            </span>
                          </span>
                        </div>

                        {/* Trust Level */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-500">Trust:</span>
                          {listing.ethosData ? (
                            <a
                              href={`https://app.ethos.network/profile/${listing.sellerAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
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

                        {/* Price & Actions Row */}
                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800/50">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-cyan-400">
                              ${listing.priceUsdc}
                            </span>
                            {/* Inventory Badge - only show for multi-use listings */}
                            {(() => {
                              const maxUses = listing.maxUses ?? 1;
                              const purchaseCount = listing.purchaseCount ?? 0;
                              const isUnlimited = maxUses === -1;
                              const remaining = isUnlimited ? null : maxUses - purchaseCount;
                              // Only show badge for multi-use or unlimited listings
                              if (!isUnlimited && maxUses <= 1) return null;
                              return (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  isUnlimited
                                    ? "bg-blue-500/20 text-blue-400"
                                    : remaining === 1
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-zinc-800 text-zinc-400"
                                }`}>
                                  {isUnlimited ? `∞` : `${remaining} left`}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </section>

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

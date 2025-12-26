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
import { fetchEthosScores } from "@/lib/ethos-scores";
import {
  fetchListingsData,
  getGradientForApp,
  GRADIENTS,
  type Listing,
  type ListingsData,
} from "@/lib/listings";
import { blo } from "blo";

/* ---------- Types ---------- */

interface ListingWithEthos extends Listing {
  ethosScore: number | null;
}

type SortField = "price" | "date" | "ethos";
type SortDirection = "asc" | "desc";

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

export default function AppPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sortField, setSortField] = useState<SortField>("price");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);
  const [ethosScores, setEthosScores] = useState<Record<string, number>>({});
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

  const error = queryError instanceof Error ? queryError.message : "";

  // Memoize allListings to ensure stable reference
  const allListings = useMemo(
    () => listingsData?.rawListings ?? [],
    [listingsData?.rawListings]
  );

  // Filter listings for this specific app
  const appListings = useMemo(() => {
    return allListings.filter((l) => l.appId === slug || l.appName === slug);
  }, [allListings, slug]);

  // Get app info from listings for non-featured apps
  const appInfo = useMemo(() => {
    if (appListings.length > 0) {
      const firstListing = appListings[0];
      return {
        name: firstListing.appName || slug,
        iconUrl: firstListing.appIconUrl || null,
      };
    }
    return null;
  }, [appListings, slug]);

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
    inviteUrl,
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

  // Listings with Ethos scores
  const listings: ListingWithEthos[] = useMemo(() => {
    return appListings.map((l) => ({
      ...l,
      ethosScore: ethosScores[l.sellerAddress.toLowerCase()] ?? null,
    }));
  }, [appListings, ethosScores]);

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

  // Fetch Ethos scores when app listings change
  useEffect(() => {
    if (appListings.length === 0) return;

    const uniqueAddresses = [
      ...new Set(appListings.map((l) => l.sellerAddress)),
    ];
    fetchEthosScores(uniqueAddresses).then(setEthosScores);
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
          if (a.ethosScore === null && b.ethosScore === null) return 0;
          if (a.ethosScore === null) return 1;
          if (b.ethosScore === null) return -1;
          return (a.ethosScore - b.ethosScore) * multiplier;
        default:
          return 0;
      }
    });

    return sorted;
  }, [listings, sortField, sortDirection]);

  const handleQuickBuy = async (listingSlug: string) => {
    setPurchasingSlug(listingSlug);
    const result = await purchase(listingSlug);
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
  const isFeatured = !!featuredApp;

  // 404 if no featured app and no listings found (after loading)
  if (!loading && !featuredApp && listings.length === 0 && !appInfo) {
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
            This app doesn&apos;t exist or has no listings yet.
          </p>
          <Link href="/">
            <button className="px-6 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-blue-500 font-semibold text-black cursor-pointer hover:from-cyan-400 hover:to-blue-400 transition-all">
              Back to Marketplace
            </button>
          </Link>
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
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors mb-8 group"
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
            Back to Marketplace
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - App Info Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden sticky top-24">
              {/* Gradient Header Bar */}
              <div
                className="h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
                }}
              />

              {/* Header - Different for featured vs non-featured */}
              {isFeatured && displayIconUrl ? (
                /* Featured: Tiled Background Header */
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
                      <Image
                        src={displayIconUrl}
                        alt={`${displayName} icon`}
                        width={80}
                        height={80}
                        className="object-contain w-full h-full rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Non-featured: Simpler gradient header */
                <div
                  className="relative h-24 md:h-28 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}30 0%, ${gradient.to}40 100%)`,
                  }}
                >
                  {/* Vignette */}
                  <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-transparent" />

                  {/* Icon if available */}
                  {displayIconUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-zinc-600 shadow-2xl bg-white p-2 ring-4 ring-black/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displayIconUrl}
                          alt={`${displayName} icon`}
                          className="object-contain w-full h-full rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* App Info */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  {isFeatured && featuredApp?.siteUrl ? (
                    <a
                      href={featuredApp.siteUrl}
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

                {/* Description - only for featured apps */}
                {isFeatured && featuredApp?.description && (
                  <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                    {featuredApp.description}
                  </p>
                )}

                {/* Stats */}
                <div
                  className={`flex items-center gap-3 ${
                    isFeatured ? "" : "mt-4"
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
                      No listings yet
                    </span>
                  )}
                </div>

                {/* CTA */}
                <Link href="/sell">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl font-semibold text-black bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
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
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Listings Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Available Listings
              </h2>

              <div className="flex items-center gap-4">
                {/* Mobile Sort Buttons */}
                {listings.length > 0 && (
                  <div className="flex md:hidden items-center gap-2">
                    <span className="text-xs text-zinc-500">Sort:</span>
                    <div className="flex gap-1">
                      {(["price", "date", "ethos"] as SortField[]).map(
                        (field) => (
                          <button
                            key={field}
                            onClick={() => handleSort(field)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
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

                {/* Auto-refresh countdown */}
                <RefreshIndicator
                  countdown={countdown}
                  isRefreshing={isRefreshing}
                  onRefresh={handleManualRefresh}
                />
              </div>
            </div>

            {/* Loading State */}
            {loading && (
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
                    {/* Ethos Score */}
                    <div className="col-span-1 md:col-span-2 flex items-center">
                      <div className="h-6 w-16 bg-zinc-800 rounded-full" />
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
            {!loading && !error && listings.length === 0 && (
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
                  No listings yet
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
            {!loading && !error && sortedListings.length > 0 && (
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
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
                      Ethos Score
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
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/30 transition-colors cursor-pointer"
                    >
                      {/* Seller - Mobile: Full width row */}
                      <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                        {/* Avatar */}
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
                              <a
                                href={sellerInfo.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-sm text-white flex items-center gap-1 hover:text-cyan-400 transition-colors truncate"
                              >
                                {sellerInfo.resolvedType === "farcaster" && "@"}
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
                              </a>
                              <a
                                href={`https://basescan.org/address/${listing.sellerAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-zinc-500 font-mono hover:text-zinc-400 transition-colors"
                              >
                                {sellerInfo.shortAddress}
                              </a>
                            </>
                          ) : (
                            <a
                              href={`https://basescan.org/address/${listing.sellerAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-sm text-zinc-300 hover:text-cyan-400 transition-colors"
                            >
                              {sellerInfo.shortAddress}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Listed - Mobile: Show label */}
                      <div className="col-span-1 md:col-span-2 flex items-center">
                        <span className="md:hidden text-xs text-zinc-500 mr-2">
                          Listed:
                        </span>
                        <span className="text-sm text-zinc-400">
                          {timeAgo(listing.createdAt)}
                        </span>
                      </div>

                      {/* Ethos Score */}
                      <div className="col-span-1 md:col-span-2 flex items-center">
                        <span className="md:hidden text-xs text-zinc-500 mr-2">
                          Ethos:
                        </span>
                        {listing.ethosScore !== null ? (
                          <a
                            href={`https://ethos.network/profile/${listing.sellerAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/50 transition-colors cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-xs font-bold text-emerald-400">
                              {listing.ethosScore}
                            </span>
                          </a>
                        ) : (
                          <span className="text-sm text-zinc-500">—</span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="col-span-1 md:col-span-2 flex items-center md:justify-end">
                        <span className="md:hidden text-xs text-zinc-500 mr-2">
                          Price:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-cyan-400">
                            ${listing.priceUsdc}
                          </span>
                          <span className="text-xs text-zinc-500">USDC</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 md:col-span-3 flex items-center gap-2 justify-end">
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
        inviteUrl={inviteUrl || ""}
        onClose={closeSuccessModal}
      />
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { featuredApps } from "@/data/featuredApps";
import { PaymentSuccessModal } from "@/app/components/PaymentSuccessModal";
import { usePurchase, LISTINGS_QUERY_KEY } from "@/hooks/usePurchase";
import {
  useResolveAddresses,
  getSellerDisplayInfo,
} from "@/lib/resolve-addresses";
import { getExplorerAddressUrl } from "@/lib/chain";
import { timeAgo } from "@/lib/time";
import { fetchEthosScores } from "@/lib/ethos-scores";
import {
  fetchListingsData,
  getGradientForApp,
  type Listing,
  type ListingsData,
} from "@/lib/listings";
import { blo } from "blo";

/* ---------- Ethos Score Fetcher ---------- */

// fetchEthosScores is imported from lib/ethos-scores.ts (with localStorage caching)

// Fetch a single listing by slug from the API
async function fetchSingleListing(slug: string): Promise<Listing | null> {
  try {
    const response = await fetch(`/api/listings/${slug}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.listing || null;
  } catch {
    return null;
  }
}

export default function ListingClient() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  const [ethosScore, setEthosScore] = useState<number | null>(null);
  const [cheaperListingEthosScore, setCheaperListingEthosScore] = useState<
    number | null
  >(null);

  const {
    purchase,
    isPending,
    inviteUrl,
    showSuccessModal,
    closeSuccessModal,
  } = usePurchase();

  // TanStack Query for listings - shares cache with homepage
  const {
    data: listingsData,
    isLoading: cacheLoading,
    error: queryError,
  } = useQuery<ListingsData>({
    queryKey: LISTINGS_QUERY_KEY,
    queryFn: fetchListingsData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Find this specific listing from the cache
  const cachedListing = useMemo(() => {
    if (!listingsData?.rawListings) return null;
    return listingsData.rawListings.find((l) => l.slug === slug) || null;
  }, [listingsData, slug]);

  // Fetch listing directly if not in cache (handles newly created listings)
  const { data: directListing, isLoading: directLoading } = useQuery({
    queryKey: ["single-listing", slug],
    queryFn: () => fetchSingleListing(slug),
    enabled: !cacheLoading && !cachedListing,
    staleTime: 60 * 1000,
  });

  // Add to main cache when direct fetch succeeds
  useEffect(() => {
    if (directListing && directListing.status === "active") {
      queryClient.setQueryData<ListingsData>(LISTINGS_QUERY_KEY, (old) => {
        if (!old) {
          return { invites: [], rawListings: [directListing] };
        }
        if (old.rawListings.some((l) => l.slug === directListing.slug)) {
          return old;
        }
        return {
          ...old,
          rawListings: [directListing, ...old.rawListings],
        };
      });
    }
  }, [directListing, queryClient]);

  // Use cached listing if available, otherwise use directly fetched listing
  const listing = cachedListing || directListing;
  // Show loading while cache is loading OR while direct fetch is in progress (when not in cache)
  const loading = cacheLoading || (!cachedListing && directLoading);

  const error = queryError instanceof Error ? queryError.message : "";

  // Resolve seller address
  const sellerAddresses = useMemo(
    () => (listing?.sellerAddress ? [listing.sellerAddress] : []),
    [listing]
  );
  const { resolvedAddresses } = useResolveAddresses(sellerAddresses);

  // Get seller display info
  const sellerInfo = useMemo(() => {
    if (!listing) return null;
    return getSellerDisplayInfo(listing.sellerAddress, resolvedAddresses);
  }, [listing, resolvedAddresses]);

  // Find cheaper listing for the same app
  const cheaperListing = useMemo(() => {
    if (!listing || !listingsData?.rawListings || !listing.appId) return null;

    const sameAppListings = listingsData.rawListings.filter(
      (l) =>
        l.appId === listing.appId &&
        l.slug !== listing.slug &&
        l.status === "active" &&
        l.priceUsdc < listing.priceUsdc
    );

    if (sameAppListings.length === 0) return null;

    // Return the cheapest one
    return sameAppListings.reduce((cheapest, current) =>
      current.priceUsdc < cheapest.priceUsdc ? current : cheapest
    );
  }, [listing, listingsData]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch Ethos score when listing loads
  useEffect(() => {
    if (!listing?.sellerAddress) return;

    fetchEthosScores([listing.sellerAddress]).then((scores) => {
      setEthosScore(scores[listing.sellerAddress.toLowerCase()] ?? null);
    });
  }, [listing]);

  // Fetch Ethos score for cheaper listing's seller
  useEffect(() => {
    // Use an abort flag to handle race conditions
    let cancelled = false;

    if (cheaperListing?.sellerAddress) {
      fetchEthosScores([cheaperListing.sellerAddress]).then((scores) => {
        if (!cancelled) {
          setCheaperListingEthosScore(
            scores[cheaperListing.sellerAddress.toLowerCase()] ?? null
          );
        }
      });
    }

    // Cleanup function resets state and prevents stale updates
    return () => {
      cancelled = true;
      setCheaperListingEthosScore(null);
    };
  }, [cheaperListing?.sellerAddress]);

  const handlePurchase = async () => {
    if (!listing) return;

    const result = await purchase(listing.slug);
    if (result) {
      // Remove the purchased listing from the shared cache
      queryClient.setQueryData<ListingsData>(LISTINGS_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          invites: old.invites.filter((inv) => inv.slug !== listing.slug),
          rawListings: old.rawListings.filter((l) => l.slug !== listing.slug),
        };
      });
    }
  };

  const getStatusConfig = (status: Listing["status"]) =>
    ({
      active: {
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/30",
        text: "text-emerald-300",
        dot: "bg-emerald-400",
        label: "Available",
      },
      sold: {
        bg: "bg-zinc-500/20",
        border: "border-zinc-500/30",
        text: "text-zinc-300",
        dot: "bg-zinc-400",
        label: "Sold",
      },
      cancelled: {
        bg: "bg-red-500/20",
        border: "border-red-500/30",
        text: "text-red-300",
        dot: "bg-red-400",
        label: "Cancelled",
      },
    }[status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-100">
        <div className="max-w-6xl mx-auto py-6 md:py-8 px-4">
          {/* Back Button Skeleton */}
          <div className="h-5 w-40 bg-zinc-800 rounded mb-8 animate-pulse" />

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left Column - Product Visual Skeleton */}
            <div className="lg:col-span-2">
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden animate-pulse">
                {/* Gradient Header Bar */}
                <div className="h-1.5 bg-zinc-800" />

                {/* Icon Display Area */}
                <div className="aspect-square relative flex items-center justify-center bg-zinc-900/50">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-zinc-800" />
                </div>

                {/* Chain Badge */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-zinc-800" />
                      <div className="h-4 w-24 bg-zinc-800 rounded" />
                    </div>
                    <div className="h-3 w-28 bg-zinc-800 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Details Skeleton */}
            <div className="lg:col-span-3 space-y-6">
              {/* Header Section */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-6 animate-pulse">
                {/* Status & Time */}
                <div className="flex items-center justify-between mb-4">
                  <div className="h-8 w-24 bg-zinc-800 rounded-full" />
                  <div className="h-4 w-20 bg-zinc-800 rounded" />
                </div>

                {/* App Name */}
                <div className="h-10 w-48 bg-zinc-800 rounded mb-2" />
                <div className="h-5 w-64 bg-zinc-800 rounded mb-6" />

                {/* Price */}
                <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="h-4 w-12 bg-zinc-800 rounded mb-2" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800" />
                    <div className="h-10 w-32 bg-zinc-800 rounded" />
                  </div>
                </div>

                {/* Button */}
                <div className="h-14 w-full bg-zinc-800 rounded-xl mt-5" />
              </div>

              {/* Seller Card */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-6 animate-pulse">
                <div className="h-4 w-12 bg-zinc-800 rounded mb-4" />
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800" />
                    <div className="space-y-2">
                      <div className="h-5 w-32 bg-zinc-800 rounded" />
                      <div className="h-4 w-24 bg-zinc-800 rounded" />
                    </div>
                  </div>
                  <div className="h-16 w-20 bg-zinc-800 rounded-xl" />
                </div>
              </div>

              {/* Payment Info Card */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-6 animate-pulse">
                <div className="h-4 w-28 bg-zinc-800 rounded mb-4" />
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                      <div className="space-y-2 flex-1">
                        <div className="h-5 w-32 bg-zinc-800 rounded" />
                        <div className="h-4 w-full bg-zinc-800 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
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
          <h2 className="text-2xl font-bold mb-3">Listing Not Found</h2>
          <p className="text-zinc-400 mb-8">
            {error || "This listing doesn't exist or has been removed."}
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

  const app = featuredApps.find((a) => a.id === listing.appId) ?? null;
  const appName = app?.appName ?? listing.appName ?? "Invite";
  const appIconUrl = app?.appIconUrl ?? listing.appIconUrl;
  const gradient = getGradientForApp(appName);
  const status = getStatusConfig(listing.status);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-6xl mx-auto py-6 md:py-8 px-4">
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

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Product Visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            {/* App Icon Card */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              {/* Gradient Header Bar */}
              <div
                className="h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
                }}
              />

              {/* Icon Display */}
              <div className="aspect-square relative flex items-center justify-center bg-zinc-950 overflow-hidden">
                {/* Tiled Pattern Background */}
                <div
                  className="absolute grid grid-cols-7 gap-6 opacity-[0.15]"
                  style={{
                    transform: "rotate(-20deg) scale(1.8)",
                  }}
                >
                  {[...Array(49)].map((_, i) => (
                    <div
                      key={i}
                      className="w-12 h-12 flex items-center justify-center"
                    >
                      {appIconUrl ? (
                        <div className="w-full h-full bg-white rounded-lg p-1.5 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={appIconUrl}
                            alt=""
                            width={48}
                            height={48}
                            className="object-contain w-full h-full"
                          />
                        </div>
                      ) : (
                        <span
                          className="text-3xl font-bold"
                          style={{ color: gradient.from }}
                        >
                          {appName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Gradient Overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at center, transparent 0%, ${gradient.from}15 60%, ${gradient.to}25 100%)`,
                  }}
                />

                {/* Vignette Effect */}
                <div className="absolute inset-0 bg-linear-to-b from-zinc-950/80 via-transparent to-zinc-950/80" />
                <div className="absolute inset-0 bg-linear-to-r from-zinc-950/80 via-transparent to-zinc-950/80" />

                {/* Main Icon */}
                <div className="relative z-10">
                  {appIconUrl ? (
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-zinc-600 shadow-2xl bg-white p-2 ring-4 ring-black/50">
                      <Image
                        src={appIconUrl}
                        alt={`${appName} icon`}
                        width={80}
                        height={80}
                        className="object-contain w-full h-full rounded-lg"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-2xl ring-4 ring-black/50"
                      style={{
                        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      }}
                    >
                      {appName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - Chain & App Link */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image
                      src="/images/base.svg"
                      alt="Base"
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    <span className="text-sm text-zinc-400">Base Network</span>
                  </div>
                  {listing.appId && (
                    <Link
                      href={`/app/${listing.appId}`}
                      className="group flex items-center gap-1.5 text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
                    >
                      <span>View all {appName} listings</span>
                      <svg
                        className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
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
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Cheaper Listing Banner */}
            {cheaperListing && listing.status === "active" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4"
              >
                <Link href={`/listing/${cheaperListing.slug}`}>
                  <div className="group relative rounded-xl overflow-hidden bg-linear-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400/50 transition-all cursor-pointer">
                    {/* Animated gradient border effect */}
                    <div className="absolute inset-0 bg-linear-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 animate-pulse" />

                    <div className="relative p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Price drop icon */}
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <svg
                              className="w-5 h-5 text-emerald-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                              />
                            </svg>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-emerald-300">
                                Cheaper listing available!
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400">
                                {Math.round(
                                  ((listing.priceUsdc -
                                    cheaperListing.priceUsdc) /
                                    listing.priceUsdc) *
                                    100
                                )}
                                % less
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-zinc-400">
                                Only{" "}
                                <span className="font-semibold text-cyan-400">
                                  ${cheaperListing.priceUsdc}
                                </span>
                              </span>
                              {cheaperListingEthosScore !== null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-zinc-500">
                                    •
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-zinc-500">
                                      Ethos score =
                                    </span>
                                    <span
                                      className={`text-xs font-medium ${
                                        ethosScore !== null &&
                                        cheaperListingEthosScore > ethosScore
                                          ? "text-emerald-400"
                                          : ethosScore !== null &&
                                            cheaperListingEthosScore <
                                              ethosScore
                                          ? "text-red-400"
                                          : "text-zinc-400"
                                      }`}
                                    >
                                      {cheaperListingEthosScore}
                                    </span>
                                    {/* Ethos comparison arrow */}
                                    {ethosScore !== null &&
                                    cheaperListingEthosScore > ethosScore ? (
                                      <svg
                                        className="w-3 h-3 text-emerald-400"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    ) : ethosScore !== null &&
                                      cheaperListingEthosScore < ethosScore ? (
                                      <svg
                                        className="w-3 h-3 text-red-400"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    ) : null}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <svg
                          className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0"
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
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column - Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Header Section */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-6">
              {/* Status & Time */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg} border ${status.border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                  <span className={`text-sm font-medium ${status.text}`}>
                    {status.label}
                  </span>
                </span>
                <span className="text-sm text-zinc-500">
                  Listed {timeAgo(listing.createdAt)}
                </span>
              </div>

              {/* App Name */}
              <div className="flex items-start justify-between gap-3 mb-2">
                {listing.appId ? (
                  <Link
                    href={`/app/${listing.appId}`}
                    className="group inline-flex items-center gap-2"
                  >
                    <h1 className="text-3xl md:text-4xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {appName}
                    </h1>
                    <svg
                      className="w-6 h-6 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all"
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
                  </Link>
                ) : (
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {appName}
                  </h1>
                )}
                {app && (
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-400">
                    Featured App
                  </span>
                )}
              </div>
              <p className="text-zinc-400 mb-6">
                Early access invite to {appName}
              </p>

              {/* Price */}
              <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="text-sm text-zinc-500 mb-1">Price</div>
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/usdc.svg"
                    alt="USDC"
                    width={40}
                    height={40}
                    className="shrink-0"
                  />
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-cyan-400">
                      ${listing.priceUsdc}
                    </span>
                    <span className="text-lg text-zinc-400 font-medium">
                      USDC
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              {listing.status === "active" && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isPending}
                  onClick={handlePurchase}
                  className="w-full mt-5 py-4 rounded-xl font-bold text-lg text-black bg-linear-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:via-cyan-300 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Purchase Now
                    </span>
                  )}
                </motion.button>
              )}

              {listing.status === "sold" && (
                <div className="w-full mt-5 py-4 rounded-xl font-bold text-lg text-center bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Sold Out
                </div>
              )}
            </div>

            {/* Seller Card */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Seller</h3>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-zinc-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        sellerInfo?.avatarUrl ||
                        blo(listing.sellerAddress as `0x${string}`)
                      }
                      alt="Seller avatar"
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Name & Address */}
                  <div className="min-w-0">
                    {sellerInfo?.resolvedType ? (
                      <>
                        <a
                          href={sellerInfo.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-base text-white flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
                        >
                          {sellerInfo.resolvedType === "farcaster" && "@"}
                          {sellerInfo.displayName}
                          {sellerInfo.resolvedType === "farcaster" && (
                            <Image
                              src="/farcaster-logo.svg"
                              alt="Farcaster"
                              width={14}
                              height={14}
                              className="inline-block opacity-70"
                            />
                          )}
                        </a>
                        <a
                          href={getExplorerAddressUrl(listing.sellerAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-zinc-500 font-mono hover:text-zinc-400 transition-colors"
                        >
                          {sellerInfo.shortAddress}
                        </a>
                      </>
                    ) : (
                      <a
                        href={getExplorerAddressUrl(listing.sellerAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-zinc-300 hover:text-cyan-400 transition-colors"
                      >
                        {listing.sellerAddress}
                      </a>
                    )}
                  </div>
                </div>

                {/* Ethos Score */}
                {ethosScore !== null && (
                  <a
                    href={`https://ethos.network/profile/${listing.sellerAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 group"
                  >
                    <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 group-hover:border-emerald-500/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xl font-bold text-emerald-400">
                          {ethosScore}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-300/70">
                        Ethos Score
                      </span>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* Payment Info Card */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">
                Payment Details
              </h3>

              <div className="space-y-4">
                {/* x402 Info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-cyan-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Powered by x402</p>
                    <p className="text-sm text-zinc-500">
                      Instant, gasless payments. No transaction fees for buyers.
                    </p>
                  </div>
                </div>

                {/* Chain Info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Image
                      src="/images/base.svg"
                      alt="Base"
                      width={20}
                      height={20}
                      className="rounded"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-white">Base Network</p>
                    <p className="text-sm text-zinc-500">
                      USDC transfers happen securely on Base L2.
                    </p>
                  </div>
                </div>

                {/* Security Info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Secure & Instant</p>
                    <p className="text-sm text-zinc-500">
                      Receive your invite link immediately after payment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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

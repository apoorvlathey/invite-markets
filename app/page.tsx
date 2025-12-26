"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NProgress from "nprogress";
import Image from "next/image";
import NumberFlow from "@number-flow/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { featuredApps } from "@/data/featuredApps";
import { timeAgo } from "@/lib/time";
import { usePurchase } from "@/hooks/usePurchase";
import { QuickBuyButton } from "@/app/components/QuickBuyButton";
import { PaymentSuccessModal } from "@/app/components/PaymentSuccessModal";
import { useResolveAddresses } from "@/lib/resolve-addresses";

/* ---------- Constants ---------- */
const AUTO_REFRESH_INTERVAL = 60; // seconds
const LISTINGS_QUERY_KEY = ["listings"];

/* ---------- Types ---------- */

interface Listing {
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

interface Invite {
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

/* ---------- Gradient Helpers ---------- */

const GRADIENTS = [
  { from: "#6366f1", to: "#8b5cf6" }, // indigo to purple
  { from: "#06b6d4", to: "#3b82f6" }, // cyan to blue
  { from: "#10b981", to: "#06b6d4" }, // emerald to cyan
  { from: "#f59e0b", to: "#ef4444" }, // amber to red
  { from: "#ec4899", to: "#8b5cf6" }, // pink to purple
  { from: "#f43f5e", to: "#fb923c" }, // rose to orange
  { from: "#8b5cf6", to: "#06b6d4" }, // purple to cyan
  { from: "#84cc16", to: "#22c55e" }, // lime to green
];

// Simple deterministic hash function for strings
function hashString(str: string): number {
  let hash = 0;
  const normalizedStr = str.toLowerCase().trim();
  for (let i = 0; i < normalizedStr.length; i++) {
    const char = normalizedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get deterministic gradient based on app name
function getGradientForApp(appName: string): { from: string; to: string } {
  const hash = hashString(appName);
  return GRADIENTS[hash % GRADIENTS.length];
}

/* ---------- Helper to transform API -> UI ---------- */

function transformListing(listing: Listing): Invite {
  // Get app name from appId or appName
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

/* ---------- Fetch Functions ---------- */

async function fetchEthosScores(
  addresses: string[]
): Promise<Record<string, number>> {
  const scoreMap: Record<string, number> = {};

  if (addresses.length === 0) return scoreMap;

  try {
    const response = await fetch(
      "https://api.ethos.network/api/v2/score/addresses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addresses }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      Object.keys(data).forEach((address) => {
        if (data[address]?.score !== undefined) {
          scoreMap[address.toLowerCase()] = data[address].score;
        }
      });
    }
  } catch (err) {
    console.error("Error fetching Ethos scores:", err);
  }

  return scoreMap;
}

async function fetchListingsData(): Promise<Invite[]> {
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

  return invitesWithScores;
}

/* ---------- Page ---------- */

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Track which listing is currently being purchased
  const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);
  // Countdown state (calculated from dataUpdatedAt)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);

  // TanStack Query for listings - caches data across route navigations
  const {
    data: invites = [],
    isLoading: loading,
    error: queryError,
    isFetching: isRefreshing,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: LISTINGS_QUERY_KEY,
    queryFn: fetchListingsData,
    staleTime: AUTO_REFRESH_INTERVAL * 1000, // Data is fresh for 60 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const error = queryError instanceof Error ? queryError.message : "";

  const {
    purchase,
    isPending,
    inviteUrl,
    showSuccessModal,
    closeSuccessModal,
  } = usePurchase();

  const handleQuickBuy = async (slug: string) => {
    setPurchasingSlug(slug);
    const result = await purchase(slug);
    if (result) {
      // Remove the purchased listing from the cache
      queryClient.setQueryData<Invite[]>(
        LISTINGS_QUERY_KEY,
        (old) => old?.filter((inv) => inv.slug !== slug) ?? []
      );
    }
    setPurchasingSlug(null);
  };

  // Get unique seller addresses from invites
  const sellerAddresses = useMemo(
    () =>
      invites.length > 0
        ? [...new Set(invites.map((invite) => invite.sellerAddress))]
        : [],
    [invites]
  );

  // Resolve addresses with localStorage caching
  const { resolvedAddresses } = useResolveAddresses(sellerAddresses);

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

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [dataUpdatedAt, refetch]);

  // Handle manual refresh
  const handleManualRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <main className="min-h-screen text-zinc-100 overflow-hidden">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center pt-16 md:pt-20 pb-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-cyan-300 font-medium">Powered by x402</span>
          </motion.div>

          {/* Main heading with gradient */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-tight">
            <span className="text-white">invite</span>
            <span className="bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              .markets
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Buy and sell early access to the{" "}
            <span className="text-cyan-400 font-medium">hottest web3 apps</span>{" "}
            — instantly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3.5 rounded-xl font-semibold text-base text-black bg-linear-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:via-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50 transition-all cursor-pointer flex items-center gap-2"
            >
              Explore Invites
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </motion.button>

            <Link href="/sell">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3.5 rounded-xl font-semibold text-base bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer"
              >
                Become a Seller
              </motion.button>
            </Link>
          </div>

          {/* Stats */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { label: "Active Listings", value: invites.length },
              { label: "Total Sales", value: "0" },
              { label: "Avg. Response", value: "< 1min" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs md:text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </motion.div> */}
        </motion.div>
      </section>

      {/* Trending */}
      <section className="relative px-4 md:px-6 lg:px-8 pb-24 md:pb-32 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Latest Listings
          </h2>

          {/* Auto-refresh countdown with manual refresh button */}
          <div className="flex items-center gap-3">
            {/* Countdown display */}
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span className="hidden sm:inline">Refreshing in</span>
              <div className="relative flex items-center justify-center">
                {/* Circular progress indicator */}
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                  {/* Background circle */}
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-zinc-800"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="url(#countdownGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 14}
                    initial={{ strokeDashoffset: 0 }}
                    animate={{
                      strokeDashoffset:
                        2 *
                        Math.PI *
                        14 *
                        (1 - countdown / AUTO_REFRESH_INTERVAL),
                    }}
                    transition={{ duration: 0.3, ease: "linear" }}
                  />
                  <defs>
                    <linearGradient
                      id="countdownGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Countdown number */}
                <span className="absolute text-xs font-medium text-zinc-300">
                  <NumberFlow
                    value={countdown}
                    format={{ minimumIntegerDigits: 2 }}
                  />
                </span>
              </div>
            </div>

            {/* Manual refresh button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="relative p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group hover:scale-105 active:scale-95"
              title="Refresh now"
            >
              <svg
                className={`w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors ${
                  isRefreshing ? "animate-spin" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>

              {/* Subtle pulse effect when refreshing */}
              {isRefreshing && (
                <span className="absolute inset-0 rounded-lg border border-cyan-500/30 animate-ping" />
              )}
            </button>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-lg animate-pulse"
              >
                {/* Top accent bar skeleton */}
                <div className="h-1 bg-zinc-800" />

                <div className="p-6">
                  {/* Header skeleton */}
                  <div className="flex items-start justify-between mb-4">
                    {/* App icon skeleton */}
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800" />

                    {/* Price skeleton */}
                    <div className="text-right space-y-1">
                      <div className="h-7 w-16 bg-zinc-800 rounded" />
                      <div className="h-3 w-10 bg-zinc-800 rounded ml-auto" />
                    </div>
                  </div>

                  {/* Title skeleton */}
                  <div className="h-7 w-3/4 bg-zinc-800 rounded mb-2" />

                  {/* Description skeleton */}
                  <div className="space-y-2 mb-6">
                    <div className="h-4 w-full bg-zinc-800 rounded" />
                    <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                  </div>

                  {/* Seller info skeleton */}
                  <div className="mb-6 pb-6 border-b border-zinc-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="h-4 w-32 bg-zinc-800 rounded" />
                      <div className="h-6 w-20 bg-zinc-800 rounded-full" />
                    </div>
                  </div>

                  {/* Button skeleton */}
                  <div className="h-11 w-full bg-zinc-900 border border-zinc-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-zinc-950 border border-red-500/30 p-8 text-center"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {!loading && !error && invites.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-zinc-950 border border-zinc-800 p-16 text-center"
          >
            <p className="text-zinc-400 text-lg">
              No invites available at the moment.
            </p>
          </motion.div>
        )}

        {!loading && !error && invites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invites.map((invite, i) => (
              <motion.div
                key={invite.slug}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4 }}
                className="group"
              >
                <div
                  onClick={() => {
                    NProgress.start();
                    router.push(`/listing/${invite.slug}`);
                  }}
                  className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 shadow-lg cursor-pointer"
                >
                  {/* Top accent bar with gradient */}
                  <div
                    className="h-1"
                    style={{
                      background: `linear-gradient(90deg, ${invite.gradientFrom}, ${invite.gradientTo})`,
                    }}
                  />

                  {/* Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      {invite.appIconUrl ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 bg-white p-1">
                          <Image
                            src={invite.appIconUrl}
                            alt={`${invite.app} icon`}
                            width={40}
                            height={40}
                            className="object-contain rounded-md w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xl text-white">
                          {invite.app.charAt(0)}
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-400">
                          {invite.price}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                          USDC
                        </div>
                      </div>
                    </div>

                    {/* Time since listed */}
                    <div className="text-xs text-zinc-500 mb-3">
                      Listed {timeAgo(invite.createdAt)}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">
                      {invite.app}
                    </h3>

                    <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                      {invite.description}
                    </p>

                    <div className="mb-6 pb-6 border-b border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-2">Seller:</p>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Seller avatar (if resolved) */}
                          {resolvedAddresses[invite.sellerAddress.toLowerCase()]
                            ?.avatarUrl && (
                            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                              <Image
                                src={
                                  resolvedAddresses[
                                    invite.sellerAddress.toLowerCase()
                                  ].avatarUrl!
                                }
                                alt="Seller avatar"
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            {/* Resolved display name or fallback to truncated address */}
                            {resolvedAddresses[
                              invite.sellerAddress.toLowerCase()
                            ]?.displayName ? (
                              <>
                                <a
                                  href={
                                    resolvedAddresses[
                                      invite.sellerAddress.toLowerCase()
                                    ].resolvedType === "farcaster"
                                      ? `https://warpcast.com/${
                                          resolvedAddresses[
                                            invite.sellerAddress.toLowerCase()
                                          ].displayName
                                        }`
                                      : `https://basescan.org/address/${invite.sellerAddress}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-medium text-sm text-zinc-300 truncate flex items-center gap-1 hover:text-cyan-400 transition-colors"
                                >
                                  {resolvedAddresses[
                                    invite.sellerAddress.toLowerCase()
                                  ].resolvedType === "farcaster" && "@"}
                                  {
                                    resolvedAddresses[
                                      invite.sellerAddress.toLowerCase()
                                    ].displayName
                                  }
                                  {resolvedAddresses[
                                    invite.sellerAddress.toLowerCase()
                                  ].resolvedType === "farcaster" && (
                                    <Image
                                      src="/farcaster-logo.svg"
                                      alt="Farcaster"
                                      width={12}
                                      height={12}
                                      className="inline-block opacity-60"
                                    />
                                  )}
                                </a>
                                {/* Show address below */}
                                <a
                                  href={`https://basescan.org/address/${invite.sellerAddress}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-zinc-500 font-mono hover:text-zinc-400 transition-colors"
                                >
                                  {invite.seller}
                                </a>
                              </>
                            ) : (
                              <a
                                href={`https://basescan.org/address/${invite.sellerAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-sm text-zinc-300 font-mono hover:text-cyan-400 transition-colors"
                              >
                                {invite.seller}
                              </a>
                            )}
                          </div>
                        </div>
                        {invite.ethos !== null && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-zinc-500">
                              Ethos:
                            </span>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span className="text-xs font-bold text-emerald-400">
                                {invite.ethos}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex gap-3">
                      <QuickBuyButton
                        price={invite.price}
                        isPending={isPending && purchasingSlug === invite.slug}
                        onBuy={() => handleQuickBuy(invite.slug)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          NProgress.start();
                          router.push(`/listing/${invite.slug}`);
                        }}
                        className="rounded-lg py-3 px-4 font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
                      >
                        <span className="text-white flex items-center justify-center gap-2">
                          Details
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
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        inviteUrl={inviteUrl || ""}
        onClose={closeSuccessModal}
      />
    </main>
  );
}

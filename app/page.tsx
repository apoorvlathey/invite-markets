"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NProgress from "nprogress";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { featuredApps } from "@/data/featuredApps";
import { timeAgo } from "@/lib/time";
import { usePurchase, LISTINGS_QUERY_KEY } from "@/hooks/usePurchase";
import { QuickBuyButton } from "@/app/components/QuickBuyButton";
import { PaymentSuccessModal } from "@/app/components/PaymentSuccessModal";
import { OnboardingModal } from "@/app/components/OnboardingModal";
import {
  RefreshIndicator,
  AUTO_REFRESH_INTERVAL,
} from "@/app/components/RefreshIndicator";
import { useResolveAddresses } from "@/lib/resolve-addresses";
import { getExplorerAddressUrl } from "@/lib/chain";
import {
  fetchListingsData,
  getGradientForApp,
  type ListingsData,
} from "@/lib/listings";
import { blo } from "blo";

/* ---------- Types ---------- */

interface FeaturedAppWithCount {
  id: string;
  appName: string;
  appIconUrl: string;
  description: string;
  activeListings: number;
  gradient: { from: string; to: string };
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
    data: listingsData,
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

  // Memoize invites and rawListings to ensure stable references
  const invites = useMemo(
    () => listingsData?.invites ?? [],
    [listingsData?.invites]
  );
  const rawListings = useMemo(
    () => listingsData?.rawListings ?? [],
    [listingsData?.rawListings]
  );

  // Compute featured apps with their listing counts
  const featuredAppsWithCounts: FeaturedAppWithCount[] = useMemo(() => {
    return featuredApps.map((app) => {
      const count = rawListings.filter((l) => l.appId === app.id).length;
      return {
        ...app,
        activeListings: count,
        gradient: getGradientForApp(app.appName),
      };
    });
  }, [rawListings]);

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
      queryClient.setQueryData<ListingsData>(LISTINGS_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          invites: old.invites.filter((inv) => inv.slug !== slug),
          rawListings: old.rawListings.filter((l) => l.slug !== slug),
        };
      });
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
              onClick={() => {
                document
                  .getElementById("latest-listings")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
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

      {/* Featured Apps Carousel */}
      <section className="relative px-4 md:px-6 lg:px-8 pb-16 md:pb-20 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
            Featured Apps
          </h2>

          {/* Scrollable carousel */}
          <div className="relative -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8">
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {featuredAppsWithCounts.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="snap-start shrink-0"
                >
                  <Link href={`/app/${app.id}`}>
                    <div className="group relative w-[320px] md:w-[380px] rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 cursor-pointer hover:-translate-y-1">
                      {/* Gradient accent bar */}
                      <div
                        className="h-1"
                        style={{
                          background: `linear-gradient(90deg, ${app.gradient.from}, ${app.gradient.to})`,
                        }}
                      />

                      {/* Tiled background header */}
                      <div className="relative h-24 md:h-28 overflow-hidden bg-zinc-900/50">
                        {/* Tiled pattern */}
                        <div
                          className="absolute inset-0 grid grid-cols-8 gap-3 opacity-[0.12] p-2"
                          style={{
                            transform: "rotate(-12deg) scale(1.4)",
                          }}
                        >
                          {[...Array(24)].map((_, j) => (
                            <div
                              key={j}
                              className="w-8 h-8 flex items-center justify-center"
                            >
                              <div className="w-full h-full bg-white rounded-md p-1 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={app.appIconUrl}
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
                            background: `linear-gradient(135deg, ${app.gradient.from}15 0%, ${app.gradient.to}20 100%)`,
                          }}
                        />

                        {/* Vignette */}
                        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-zinc-950/50" />
                        <div className="absolute inset-0 bg-linear-to-r from-zinc-950/60 via-transparent to-zinc-950/60" />
                      </div>

                      {/* Card content */}
                      <div className="p-5 flex items-center gap-4">
                        {/* App icon */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-700 bg-white p-1.5 shrink-0 shadow-lg">
                          <Image
                            src={app.appIconUrl}
                            alt={`${app.appName} icon`}
                            width={48}
                            height={48}
                            className="object-contain rounded-lg w-full h-full"
                          />
                        </div>

                        {/* App info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                            {app.appName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {app.activeListings > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {app.activeListings} active{" "}
                                {app.activeListings === 1
                                  ? "listing"
                                  : "listings"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-400">
                                Sold out
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="shrink-0">
                          <svg
                            className="w-5 h-5 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all"
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
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Latest Listings */}
      <section
        id="latest-listings"
        className="relative px-4 md:px-6 lg:px-8 pb-24 md:pb-32 max-w-7xl mx-auto scroll-mt-24"
      >
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Latest Listings
          </h2>

          {/* Auto-refresh countdown with manual refresh button */}
          <RefreshIndicator
            countdown={countdown}
            isRefreshing={isRefreshing}
            onRefresh={handleManualRefresh}
          />
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
                          {/* Seller avatar */}
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                resolvedAddresses[
                                  invite.sellerAddress.toLowerCase()
                                ]?.avatarUrl ||
                                blo(invite.sellerAddress as `0x${string}`)
                              }
                              alt="Seller avatar"
                              width={24}
                              height={24}
                              className="w-full h-full object-cover"
                            />
                          </div>
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
                                      ? `https://farcaster.xyz/${
                                          resolvedAddresses[
                                            invite.sellerAddress.toLowerCase()
                                          ].displayName
                                        }`
                                      : getExplorerAddressUrl(
                                          invite.sellerAddress
                                        )
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
                                  href={getExplorerAddressUrl(
                                    invite.sellerAddress
                                  )}
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
                                href={getExplorerAddressUrl(
                                  invite.sellerAddress
                                )}
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

      {/* First-time Visitor Onboarding */}
      <OnboardingModal />
    </main>
  );
}

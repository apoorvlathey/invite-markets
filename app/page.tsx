"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { featuredApps } from "@/data/featuredApps";

/* ---------- Types ---------- */

interface Listing {
  slug: string;
  inviteUrl: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  appId?: string;
  appName?: string;
  createdAt: string;
  updatedAt: string;
}

interface Invite {
  app: string;
  appIconUrl?: string;
  description: string;
  price: string;
  seller: string;
  ethos: number | null;
  gradientFrom: string;
  gradientTo: string;
  slug: string;
  sellerAddress: string;
}

/* ---------- Helper to transform API -> UI ---------- */

function transformListing(listing: Listing): Invite {
  // Get app name from appId or appName
  let host = "App";
  let appIconUrl: string | undefined;

  if (listing.appId) {
    const featuredApp = featuredApps.find((app) => app.id === listing.appId);
    if (featuredApp) {
      host = featuredApp.appName;
      appIconUrl = featuredApp.appIconUrl;
    } else {
      host = listing.appId;
    }
  } else if (listing.appName) {
    host = listing.appName;
  } else {
    // Fallback to extracting from URL
    try {
      host = new URL(listing.inviteUrl).hostname.split(".")[0] || "App";
    } catch {
      // keep default
    }
  }

  const gradients = [
    { from: "#6366f1", to: "#8b5cf6" }, // indigo to purple
    { from: "#06b6d4", to: "#3b82f6" }, // cyan to blue
    { from: "#10b981", to: "#06b6d4" }, // emerald to cyan
    { from: "#f59e0b", to: "#ef4444" }, // amber to red
    { from: "#ec4899", to: "#8b5cf6" }, // pink to purple
  ];
  const gradient =
    gradients[Math.abs(listing.slug.charCodeAt(0)) % gradients.length];
  const shortAddr = `${listing.sellerAddress.slice(
    0,
    6
  )}…${listing.sellerAddress.slice(-4)}`;

  return {
    app: host.charAt(0).toUpperCase() + host.slice(1),
    appIconUrl,
    description: `Early access invite to ${host}`,
    price: `$${listing.priceUsdc}`,
    seller: shortAddr,
    ethos: null,
    gradientFrom: gradient.from,
    gradientTo: gradient.to,
    slug: listing.slug,
    sellerAddress: listing.sellerAddress,
  };
}

/* ---------- Page ---------- */

export default function Home() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEthosScores = async (
      addresses: string[]
    ): Promise<Record<string, number>> => {
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
    };

    const fetchListings = async () => {
      try {
        setLoading(true);
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

        setInvites(invitesWithScores);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load listings"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

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
            <span className="text-white">Invite</span>
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
              className="px-8 py-3.5 rounded-xl font-semibold text-base text-black bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all cursor-pointer flex items-center gap-2"
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

            <Link href="/seller">
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
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12">
          Trending Invites
        </h2>

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
                <Link href={`/listing/${invite.slug}`}>
                  <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 shadow-lg">
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
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-zinc-800 bg-zinc-900 relative">
                            <Image
                              src={invite.appIconUrl}
                              alt={`${invite.app} icon`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xl text-white">
                            {invite.app.charAt(0)}
                          </div>
                        )}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">
                            {invite.price}
                          </div>
                          <div className="text-xs text-zinc-500 font-medium">
                            USDC
                          </div>
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-2">
                        {invite.app}
                      </h3>

                      <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                        {invite.description}
                      </p>

                      <div className="mb-6 pb-6 border-b border-zinc-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-sm text-zinc-300 font-mono">
                              {invite.seller}
                            </p>
                          </div>
                          {invite.ethos !== null && (
                            <div className="flex items-center gap-2">
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

                      {/* CTA Button - subtle, no gradient */}
                      <button className="w-full rounded-lg py-3 px-4 font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer">
                        <span className="text-white flex items-center justify-center gap-2">
                          View Details
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
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

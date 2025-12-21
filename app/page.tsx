"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

/* ---------- Types ---------- */

interface Listing {
  slug: string;
  inviteUrl: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface Invite {
  app: string;
  description: string;
  price: string;
  seller: string;
  address: string;
  ethos: number | null;
  gradientFrom: string;
  gradientTo: string;
  slug: string;
  sellerAddress: string;
}

/* ---------- Helper to transform API -> UI ---------- */

function transformListing(listing: Listing): Invite {
  let host = "App";
  try {
    host = new URL(listing.inviteUrl).hostname.split(".")[0] || "App";
  } catch {
    // keep default
  }

  const gradients = [
    { from: "#6366f1", to: "#8b5cf6" }, // indigo to purple
    { from: "#06b6d4", to: "#3b82f6" }, // cyan to blue
    { from: "#10b981", to: "#06b6d4" }, // emerald to cyan
    { from: "#f59e0b", to: "#ef4444" }, // amber to red
    { from: "#ec4899", to: "#8b5cf6" }, // pink to purple
  ];
  const gradient = gradients[Math.abs(listing.slug.charCodeAt(0)) % gradients.length];
  const shortAddr = `${listing.sellerAddress.slice(
    0,
    6
  )}…${listing.sellerAddress.slice(-4)}`;

  return {
    app: host.charAt(0).toUpperCase() + host.slice(1),
    description: `Early access invite to ${host}`,
    price: `$${listing.priceUsdc}`,
    seller: `${listing.sellerAddress.slice(0, 8)}.eth`,
    address: shortAddr,
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
    const fetchEthosScores = async (addresses: string[]): Promise<Record<string, number>> => {
      const scoreMap: Record<string, number> = {};
      
      if (addresses.length === 0) return scoreMap;

      try {
        const response = await fetch("https://api.ethos.network/api/v2/score/addresses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ addresses }),
        });

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
    <main className="min-h-screen bg-black text-zinc-100 overflow-hidden">
      {/* Enhanced background effects */}
      <div className="fixed inset-0 -z-10">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)]" />
      </div>

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
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full glass border border-cyan-500/30 text-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-cyan-300 font-medium">Powered by x402</span>
          </motion.div>

          {/* Main heading with gradient */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-tight">
            <span className="bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent drop-shadow-2xl">
              Invite
            </span>
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient">
              .markets
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
            Buy and sell early access to the{" "}
            <span className="text-cyan-400 font-medium">hottest web3 apps</span>{" "}
            — instantly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative inline-flex items-center justify-center rounded-2xl px-10 py-5 font-semibold text-lg overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-cyan-400 to-blue-400" />
              <span className="relative z-10 text-black flex items-center gap-2">
                Explore Invites
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-gradient-to-r from-cyan-500 to-blue-500" />
            </motion.button>

            <Link href="/seller">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative inline-flex items-center justify-center rounded-2xl px-10 py-5 font-semibold text-lg glass-strong hover:bg-white/10 transition-all cursor-pointer"
              >
                <span className="relative z-10 text-white">Become a Seller</span>
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
        <div className="flex items-baseline justify-between mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Trending Invites
          </h2>
          <span className="text-sm text-zinc-500">Updated just now</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-purple-500 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl glass border-red-500/20 p-8 text-center"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {!loading && !error && invites.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl glass p-16 text-center"
          >
            <p className="text-zinc-400 text-lg">No invites available at the moment.</p>
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
                whileHover={{ y: -8 }}
                className="group"
              >
                <Link href={`/listing/${invite.slug}`}>
                  <div className="relative rounded-3xl overflow-hidden shadow-premium hover:shadow-premium-hover transition-all duration-300">
                    {/* Gradient header with animation */}
                    <div 
                      className="relative h-48 p-6 flex flex-col justify-between overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${invite.gradientFrom}, ${invite.gradientTo})`
                      }}
                    >
                      {/* Shimmer overlay */}
                      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Glass overlay for depth */}
                      <div className="absolute inset-0 bg-black/10" />
                      
                      <div className="relative z-10">
                        <div className="mb-4">
                          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center font-bold text-2xl text-white shadow-lg">
                            {invite.app.charAt(0)}
                          </div>
                        </div>
                        
                        <h3 className="text-3xl font-bold text-white drop-shadow-lg">
                          {invite.app}
                        </h3>
                      </div>

                      <div className="relative z-10 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white drop-shadow-lg">
                          {invite.price}
                        </span>
                        <span className="text-sm text-white/80 font-medium">USDC</span>
                      </div>
                    </div>

                    {/* Content section */}
                    <div className="relative bg-zinc-950/90 backdrop-blur-xl border-t border-white/5 p-6">
                      <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                        {invite.description}
                      </p>

                      <div className="mb-6 pb-6 border-b border-white/5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-sm text-zinc-200 mb-1">
                              {invite.seller}
                            </p>
                            <p className="text-xs text-zinc-600 font-mono">
                              {invite.address}
                            </p>
                          </div>
                          {invite.ethos !== null && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">Ethos score:</span>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-bold text-emerald-400">
                                  {invite.ethos}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CTA Button */}
                      <button className="relative w-full rounded-xl py-3.5 px-4 font-semibold overflow-hidden group/btn cursor-pointer">
                        <div 
                          className="absolute inset-0 transition-transform group-hover/btn:scale-110"
                          style={{
                            background: `linear-gradient(135deg, ${invite.gradientFrom}, ${invite.gradientTo})`
                          }}
                        />
                        <span className="relative z-10 text-white flex items-center justify-center gap-2">
                          Buy Invite
                          <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                        <div 
                          className="absolute -inset-1 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity blur-lg"
                          style={{
                            background: `linear-gradient(135deg, ${invite.gradientFrom}, ${invite.gradientTo})`
                          }}
                        />
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

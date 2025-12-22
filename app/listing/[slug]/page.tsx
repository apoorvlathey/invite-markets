"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface Listing {
  slug: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export default function ListingPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { address } = useAccount();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchListing = async () => {
      try {
        const response = await fetch(`/api/listings/${slug}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch listing");
        }

        setListing(data.listing);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load listing");
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-purple-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-3xl glass-strong shadow-premium p-10 text-center"
        >
          <h2 className="text-3xl font-bold mb-3">Listing Not Found</h2>
          <p className="text-zinc-400 mb-8 text-lg">
            {error || "This listing doesn't exist"}
          </p>
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative inline-flex items-center justify-center rounded-2xl px-8 py-4 font-semibold overflow-hidden group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <span className="relative z-10 text-black">Go Home</span>
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-5xl mx-auto py-12 px-4 md:px-6">

        {/* Wallet connect (optional) */}
        <div className="flex justify-end mb-6">
          <ConnectButton />
        </div>

        <Link
          href="/"
          className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-10 group transition-colors duration-150"
        >
          ← Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl glass-strong shadow-premium overflow-hidden"
            >
              <div className="p-8 border-b border-white/5">
                <h1 className="text-4xl font-bold mb-4">
                  Invite Listing
                </h1>

                <div className="text-5xl font-bold text-cyan-400">
                  ${listing.priceUsdc} USDC
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Seller Address */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Seller Address
                  </label>
                  <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 font-mono text-sm break-all">
                    {listing.sellerAddress}
                  </div>
                </div>

                {/* Purchase Button BELOW seller address */}
                {listing.status === "active" && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative w-full rounded-2xl py-4 px-6 font-bold text-lg overflow-hidden cursor-pointer"
                    onClick={() => {
                      alert("x402 purchase flow coming next");
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-transform group-hover:scale-110" />
                    <span className="relative z-10 text-black">
                      Purchase Now
                    </span>
                    <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-gradient-to-r from-cyan-500 to-blue-500" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

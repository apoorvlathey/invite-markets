"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createThirdwebClient } from "thirdweb";
import { useFetchWithPayment } from "thirdweb/react";
import { featuredApps } from "@/data/featuredApps";

interface Listing {
  slug: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  appId?: string;
  appName?: string;
  createdAt: string;
  updatedAt: string;
}

const thirdwebClient = createThirdwebClient({
  clientId: process.env.CLIENT_ID
});

export default function ListingPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { isConnected } = useAccount();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { fetchWithPayment, isPending } =
  useFetchWithPayment(thirdwebClient);

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

  const handlePurchase = async () => {
    if (!listing) return;

    try {
      const res = await fetchWithPayment(
        `/api/purchase/${listing.slug}`,
        { method: "POST" }
      );

      console.log("res", res)

      if (res?.inviteUrl) {
        window.location.href = res.inviteUrl;
      }
    } catch (err) {
      console.error("Purchase failed", err);
      alert("Payment failed or was cancelled");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-purple-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
<<<<<<< HEAD
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-4">
=======
      <div className="min-h-screen text-zinc-100 flex items-center justify-center p-4">
>>>>>>> main
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-xl bg-zinc-950 border border-zinc-800 p-10 text-center"
        >
<<<<<<< HEAD
          <h2 className="text-3xl font-bold mb-3">Listing Not Found</h2>
=======
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-3 text-white">
            Listing Not Found
          </h2>
>>>>>>> main
          <p className="text-zinc-400 mb-8 text-lg">
            {error || "This listing doesn't exist"}
          </p>
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl px-8 py-4 font-semibold text-black bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all cursor-pointer inline-flex items-center justify-center"
            >
<<<<<<< HEAD
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <span className="relative z-10 text-black">Go Home</span>
=======
              Go Home
>>>>>>> main
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

<<<<<<< HEAD
  return (
    <div className="min-h-screen bg-black text-zinc-100">
=======
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          bg: "bg-linear-to-r from-emerald-500/20 to-green-500/20",
          border: "border-emerald-400/30",
          text: "text-emerald-300",
          dot: "bg-emerald-400",
        };
      case "sold":
        return {
          bg: "bg-linear-to-r from-zinc-500/20 to-gray-500/20",
          border: "border-zinc-400/30",
          text: "text-zinc-300",
          dot: "bg-zinc-400",
        };
      case "cancelled":
        return {
          bg: "bg-linear-to-r from-red-500/20 to-orange-500/20",
          border: "border-red-400/30",
          text: "text-red-300",
          dot: "bg-red-400",
        };
      default:
        return {
          bg: "bg-zinc-500/20",
          border: "border-zinc-400/30",
          text: "text-zinc-300",
          dot: "bg-zinc-400",
        };
    }
  };

  const statusConfig = getStatusConfig(listing.status);

  // Get app display name
  const getAppDisplayName = () => {
    if (listing.appId) {
      const featuredApp = featuredApps.find((app) => app.id === listing.appId);
      return featuredApp ? featuredApp.appName : listing.appId;
    }
    return listing.appName || "Unknown App";
  };

  const isFeaturedApp = !!listing.appId;

  // Get featured app data including icon
  const getFeaturedAppData = () => {
    if (listing.appId) {
      return featuredApps.find((app) => app.id === listing.appId);
    }
    return null;
  };

  const featuredAppData = getFeaturedAppData();

  return (
    <div className="min-h-screen text-zinc-100">
>>>>>>> main
      <div className="max-w-5xl mx-auto py-12 px-4 md:px-6">

        {/* Wallet connect */}
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
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden"
            >
<<<<<<< HEAD
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
=======
              {/* Header */}
              <div className="p-8 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex-1">
                    {/* App info with icon */}
                    <div className="flex items-center gap-4 mb-4">
                      {featuredAppData?.appIconUrl && (
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-zinc-700 bg-zinc-800 shrink-0 relative">
                          <Image
                            src={featuredAppData.appIconUrl}
                            alt={`${getAppDisplayName()} icon`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                          {getAppDisplayName()}
                        </h1>
                        {isFeaturedApp && (
                          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-400 font-medium">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Featured App
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-zinc-500 font-mono">
                        ID: {listing.slug}
                      </p>
                      <button
                        onClick={() => copyToClipboard(listing.slug)}
                        className="text-zinc-500 hover:text-cyan-400 transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <svg
                            className="w-4 h-4 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
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
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bg} border ${statusConfig.border}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${statusConfig.dot}`}
                    />
                    <span
                      className={`text-sm font-semibold ${statusConfig.text}`}
                    >
                      {listing.status.charAt(0).toUpperCase() +
                        listing.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="inline-flex items-baseline gap-3 px-6 py-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <span className="text-5xl font-bold text-cyan-400">
                    ${listing.priceUsdc}
                  </span>
                  <span className="text-2xl text-zinc-400 font-medium">
                    USDC
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-8 space-y-6 bg-zinc-950">
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                    Invite URL
                  </label>
                  <div className="group relative rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 transition-all">
                    <div className="flex items-center justify-between gap-4">
                      <a
                        href={listing.inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 transition-colors break-all"
                      >
                        {listing.inviteUrl}
                      </a>
                      <button
                        onClick={() => copyToClipboard(listing.inviteUrl)}
                        className="shrink-0 p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-all cursor-pointer"
                      >
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                    Seller Address
                  </label>
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5 font-mono text-sm text-zinc-200 break-all flex items-center justify-between gap-4">
                    <span>{listing.sellerAddress}</span>
                    <button
                      onClick={() => copyToClipboard(listing.sellerAddress)}
                      className="shrink-0 p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-all cursor-pointer"
                    >
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
>>>>>>> main
                  </div>
                </div>

<<<<<<< HEAD
                {/* Purchase Button */}
                {listing.status === "active" && (
                  <motion.button
                    whileHover={{ scale: isConnected ? 1.02 : 1 }}
                    whileTap={{ scale: isConnected ? 0.98 : 1 }}
                    disabled={!isConnected || isPending}
                    onClick={handlePurchase}
                    className="group relative w-full rounded-2xl py-4 px-6 font-bold text-lg overflow-hidden
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500" />
                    <span className="relative z-10 text-black">
                      {isPending ? "Processing payment..." : "Purchase Now"}
                    </span>
                  </motion.button>
                )}
              </div>
=======
          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl bg-zinc-950 border border-zinc-800 p-6 space-y-6"
            >
              <h3 className="text-xl font-bold text-white">Listing Info</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">
                    Listed On
                  </label>
                  <p className="text-sm text-zinc-200 font-medium">
                    {formatDate(listing.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">
                    Last Updated
                  </label>
                  <p className="text-sm text-zinc-200 font-medium">
                    {formatDate(listing.updatedAt)}
                  </p>
                </div>
              </div>

              {listing.status === "active" && (
                <div className="pt-6 border-t border-zinc-800">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-xl py-4 px-6 font-bold text-lg text-black bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all cursor-pointer flex items-center justify-center gap-2"
                    onClick={() => alert("Purchase functionality coming soon!")}
                  >
                    Purchase Now
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
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </motion.button>
                  <p className="text-center text-xs text-zinc-500 mt-3">
                    Secure gasless payment via x402
                  </p>
                </div>
              )}
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-zinc-950 border border-emerald-500/30 p-6"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
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
                Protected
              </h3>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Instant delivery
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified seller
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Gasless payment
                </li>
              </ul>
>>>>>>> main
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

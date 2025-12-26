"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { featuredApps } from "@/data/featuredApps";
import { PaymentSuccessModal } from "@/app/components/PaymentSuccessModal";
import { usePurchase } from "@/hooks/usePurchase";
import {
  useResolveAddresses,
  getSellerDisplayInfo,
} from "@/lib/resolve-addresses";

interface Listing {
  slug: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  appId?: string;
  appName?: string;
  inviteUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ListingPage() {
  const { slug } = useParams<{ slug: string }>();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { purchase, isPending, inviteUrl, showSuccessModal, closeSuccessModal } =
    usePurchase();

  // Resolve seller address
  const sellerAddresses = useMemo(
    () => (listing?.sellerAddress ? [listing.sellerAddress] : []),
    [listing?.sellerAddress]
  );
  const { resolvedAddresses } = useResolveAddresses(sellerAddresses);

  // Get seller display info
  const sellerInfo = useMemo(() => {
    if (!listing) return null;
    return getSellerDisplayInfo(listing.sellerAddress, resolvedAddresses);
  }, [listing, resolvedAddresses]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const res = await fetch(`/api/listings/${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setListing(data.listing);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load listing");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const handlePurchase = async () => {
    if (!listing) return;

    const result = await purchase(listing.slug);
    if (result) {
      // Update listing state to sold immediately
      setListing((prev) => (prev ? { ...prev, status: "sold" } : prev));
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusConfig = (status: Listing["status"]) =>
    ({
      active: {
        bg: "bg-emerald-500/20",
        text: "text-emerald-300",
        dot: "bg-emerald-400",
      },
      sold: {
        bg: "bg-zinc-500/20",
        text: "text-zinc-300",
        dot: "bg-zinc-400",
      },
      cancelled: {
        bg: "bg-red-500/20",
        text: "text-red-300",
        dot: "bg-red-400",
      },
    }[status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-20 h-20 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-10 text-center">
          <h2 className="text-3xl font-bold mb-3">Listing Not Found</h2>
          <p className="text-zinc-400 mb-8">{error}</p>
          <Link href="/">
            <button className="px-6 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-blue-500 font-semibold text-black">
              Go Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const app = featuredApps.find((a) => a.id === listing.appId) ?? null;
  const status = getStatusConfig(listing.status);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <Link href="/" className="text-cyan-400 mb-8 inline-block">
          ← Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl">
            <div className="p-8 border-b border-zinc-800">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-bold mb-2">
                    {app?.appName ?? listing.appName ?? "Invite"}
                  </h1>
                  <p className="text-zinc-500 font-mono text-sm">
                    {listing.slug}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full ${status.bg} ${status.text}`}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-2 ${status.dot}`}
                  />
                  {listing.status}
                </span>
              </div>

              <div className="mt-6 text-5xl font-bold text-cyan-400">
                ${listing.priceUsdc} USDC
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="text-sm text-zinc-400">Seller</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    {/* Seller avatar */}
                    {sellerInfo?.avatarUrl && (
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                        <Image
                          src={sellerInfo.avatarUrl}
                          alt="Seller avatar"
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {/* Resolved display name */}
                      {sellerInfo?.resolvedType ? (
                        <>
                          <a
                            href={sellerInfo.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-base text-zinc-200 flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
                          >
                            {sellerInfo.resolvedType === "farcaster" && "@"}
                            {sellerInfo.displayName}
                            {sellerInfo.resolvedType === "farcaster" && (
                              <Image
                                src="/farcaster-logo.svg"
                                alt="Farcaster"
                                width={14}
                                height={14}
                                className="inline-block opacity-60"
                              />
                            )}
                          </a>
                          {/* Show address below */}
                          <a
                            href={`https://basescan.org/address/${listing.sellerAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-zinc-500 font-mono hover:text-zinc-400 transition-colors"
                          >
                            {listing.sellerAddress}
                          </a>
                        </>
                      ) : (
                        <a
                          href={`https://basescan.org/address/${listing.sellerAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-zinc-300 hover:text-cyan-400 transition-colors break-all"
                        >
                          {listing.sellerAddress}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {listing.status === "active" && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isPending}
                  onClick={handlePurchase}
                  className="w-full py-4 rounded-xl font-bold text-lg text-black bg-linear-to-r from-cyan-500 to-blue-500 disabled:opacity-50"
                >
                  {isPending ? "Processing payment..." : "Purchase Now"}
                </motion.button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div>
              <p className="text-xs text-zinc-500">Listed</p>
              <p>{formatDate(listing.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Updated</p>
              <p>{formatDate(listing.updatedAt)}</p>
            </div>
            <p className="text-xs text-zinc-500 pt-4 border-t border-zinc-800">
              Secure gasless payment via x402
            </p>
          </div>
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

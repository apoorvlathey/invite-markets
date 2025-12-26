"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createThirdwebClient } from "thirdweb";
import { useFetchWithPayment } from "thirdweb/react";
import { featuredApps } from "@/data/featuredApps";
import { PaymentSuccessModal } from "../../components/PaymentSuccessModal";

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

const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

export default function ListingPage() {
  const { slug } = useParams<{ slug: string }>();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  const { fetchWithPayment, isPending } = useFetchWithPayment(thirdwebClient);

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

    try {
      const res = (await fetchWithPayment(`/api/purchase/${listing.slug}`, {
        method: "POST",
      })) as { inviteUrl?: string } | undefined;

      if (res?.inviteUrl) {
        // Show modal instead of redirecting
        setInviteUrl(res.inviteUrl);
        setShowSuccessModal(true);
      }
    } catch {
      alert("Payment failed or cancelled");
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
      <div className="max-w-6xl mx-auto py-12 px-4">
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
                <label className="text-sm text-zinc-400">Seller Address</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-sm">
                  {listing.sellerAddress}
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
        inviteUrl={inviteUrl}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
}

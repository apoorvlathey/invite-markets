"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { blo } from "blo";
import {
  useResolveAddresses,
  getSellerDisplayInfo,
} from "@/lib/resolve-addresses";
import { getExplorerAddressUrl } from "@/lib/chain";
import { fetchEthosData, type EthosData } from "@/lib/ethos-scores";
import { featuredApps } from "@/data/featuredApps";
import {
  useActiveAccount
} from "thirdweb/react";

// Helper to resolve appId to proper app name
function getAppDisplayName(appId?: string, appName?: string, fallback?: string): string {
  if (appId) {
    const featuredApp = featuredApps.find((app) => app.id === appId);
    if (featuredApp) {
      return featuredApp.appName;
    }
    // If appId doesn't match any featured app, use appName or appId
    return appName || appId;
  }
  return appName || fallback || "Unknown App";
}

interface ProfileClientProps {
  address: string;
  currentUserAddress?: string;
}

interface Purchase {
  id: string;
  listingSlug: string;
  sellerAddress: string;
  priceUsdc: number;
  appId?: string;
  createdAt: string;
}

interface Listing {
  _id: string;
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

interface SellerStats {
  salesCount: number;
  totalRevenue: number;
}

function getTrustLevelConfig(level: string) {
  const normalizedLevel = level.toLowerCase();
  switch (normalizedLevel) {
    case "trusted":
      return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400", label: "Trusted" };
    case "neutral":
      return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-400", label: "Neutral" };
    case "questionable":
      return { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-400", label: "Questionable" };
    case "untrusted":
      return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-400", label: "Untrusted" };
    default:
      return { bg: "bg-zinc-500/10", border: "border-zinc-500/30", text: "text-zinc-400", dot: "bg-zinc-400", label: "Unknown" };
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer text-sm font-medium">
      {copied ? (
        <>
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-zinc-300">{label}</span>
        </>
      )}
    </button>
  );
}

function EditListingModal({ listing, onClose, onUpdate }: { listing: Listing; onClose: () => void; onUpdate: () => void }) {
  const [price, setPrice] = useState(listing.priceUsdc.toString());
  const [inviteUrl, setInviteUrl] = useState(listing.inviteUrl);
  const [appName, setAppName] = useState(listing.appName || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/listings/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: listing.slug,
          sellerAddress: listing.sellerAddress,
          priceUsdc: parseFloat(price),
          inviteUrl,
          appName: listing.appId ? undefined : appName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onUpdate();
        onClose();
      } else {
        setError(data.error || "Failed to update listing");
      }
    } catch (err) {
      setError(`Failed to update listing: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Edit Listing</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Price (USDC)</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500 focus:outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Invite URL</label>
            <input type="url" value={inviteUrl} onChange={(e) => setInviteUrl(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500 focus:outline-none" required />
          </div>

          {!listing.appId && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">App Name</label>
              <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500 focus:outline-none" required />
            </div>
          )}

          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50">
              {isLoading ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ListingCard({ listing, isOwner, onEdit, onDelete }: { listing: Listing; isOwner: boolean; onEdit: () => void; onDelete: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/listings/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: listing.slug, sellerAddress: listing.sellerAddress }),
      });
      const data = await response.json();
      if (data.success) onDelete();
    } catch (err) {
      console.error("Failed to delete listing:", err);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link href={`/listing/${listing.slug}`} className="text-base font-semibold text-white hover:text-cyan-400 transition-colors block mb-2">
            {getAppDisplayName(listing.appId, listing.appName, listing.slug)}
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="font-medium text-emerald-400">${listing.priceUsdc.toFixed(2)}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${listing.status === "active" ? "bg-emerald-500/10 text-emerald-400" : listing.status === "sold" ? "bg-blue-500/10 text-blue-400" : "bg-zinc-500/10 text-zinc-400"}`}>
              {listing.status}
            </span>
          </div>
        </div>

        {isOwner && listing.status === "active" && (
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all group" title="Edit listing">
              <svg className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={() => setShowConfirmDelete(true)} disabled={isDeleting} className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all group disabled:opacity-50" title="Delete listing">
              <svg className="w-4 h-4 text-red-400 group-hover:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-zinc-800">
            <p className="text-sm text-zinc-400 mb-3">Delete this listing?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirmDelete(false)} className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition-colors disabled:opacity-50">
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PurchaseCard({ purchase, sellerInfo }: { purchase: Purchase; sellerInfo: ReturnType<typeof getSellerDisplayInfo> }) {
  const date = new Date(purchase.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link href={`/listing/${purchase.listingSlug}`} className="text-base font-semibold text-white hover:text-cyan-400 transition-colors block mb-2">
            {getAppDisplayName(purchase.appId, undefined, purchase.listingSlug)}
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-500">Seller:</span>
            <Link href={`/profile/${purchase.sellerAddress}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image src={sellerInfo.avatarUrl || blo(purchase.sellerAddress as `0x${string}`)} alt="Seller" width={20} height={20} className="rounded-full" />
              <span className="text-sm font-medium text-cyan-400">{sellerInfo.displayName}</span>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="font-medium text-emerald-400">${purchase.priceUsdc.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link href={`/profile/${purchase.sellerAddress}?review=true`} className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all group" title="Review seller">
            <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function ProfileClient({ address }: ProfileClientProps) {
  const router = useRouter();
  const { resolvedAddresses, isLoading } = useResolveAddresses([address]);
  const displayInfo = getSellerDisplayInfo(address, resolvedAddresses);
  const [ethosData, setEthosData] = useState<EthosData | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [sellerAddresses, setSellerAddresses] = useState<string[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [activeTab, setActiveTab] = useState<"listings" | "purchases">("listings");
  const account = useActiveAccount();

  const isOwnProfile = address?.toLowerCase() === account?.address.toLowerCase();
  const { resolvedAddresses: resolvedSellers } = useResolveAddresses(sellerAddresses);
  const bloAvatar = blo(address as `0x${string}`);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchEthosData([address]).then((data) => {
      setEthosData(data[address.toLowerCase()] ?? null);
    });
  }, [address]);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const response = await fetch(`/api/buyer/${address}`);
        const data = await response.json();
        if (data.success) {
          setPurchases(data.purchases);
          const sellers = [...new Set(data.purchases.map((p: Purchase) => p.sellerAddress))] as string[];
          setSellerAddresses(sellers);
        }
      } catch (error) {
        console.error("Failed to fetch purchases:", error);
      } finally {
        setPurchasesLoading(false);
      }
    };
    fetchPurchases();
  }, [address]);

  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        const response = await fetch(`/api/seller/${address}`);
        const data = await response.json();
        if (data.success) {
          setListings(data.listings || []);
          setSellerStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch seller data:", error);
      } finally {
        setListingsLoading(false);
      }
    };
    fetchSellerData();
  }, [address]);

  const handleListingUpdate = () => {
    fetch(`/api/seller/${address}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setListings(data.listings || []);
          setSellerStats(data.stats);
        }
      });
  };

  const trustLevelConfig = ethosData ? getTrustLevelConfig(ethosData.level) : null;
  const activeListings = listings.filter(l => l.status === "active");

  return (
    <div className="min-h-screen text-zinc-100">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s", animationDelay: "1s" }} />
      </div>

      <div className="max-w-2xl mx-auto py-16 px-4 md:px-6">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-zinc-950 border border-zinc-800 shadow-premium overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:40px_40px]" />
          </div>

          <div className="px-8 -mt-12 relative z-10">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-zinc-950 shadow-xl">
                {isLoading ? <div className="w-full h-full bg-zinc-800 animate-pulse" /> : <Image src={displayInfo.avatarUrl || bloAvatar} alt="Avatar" width={96} height={96} className="w-full h-full object-cover" />}
              </div>
              {displayInfo.resolvedType && (
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-medium text-cyan-400 capitalize">{displayInfo.resolvedType}</div>
              )}
            </motion.div>
          </div>

          <div className="px-8 pt-4 pb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              {isLoading ? <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse mb-2" /> : <h1 className="text-2xl font-bold text-white mb-1">{displayInfo.displayName}</h1>}
              {displayInfo.displayName !== displayInfo.shortAddress && <p className="text-sm text-zinc-500 font-mono">{displayInfo.shortAddress}</p>}
            </motion.div>

            {ethosData && trustLevelConfig && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6">
                <a href={`https://app.ethos.network/profile/${address}`} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl ${trustLevelConfig.bg} border ${trustLevelConfig.border} hover:border-opacity-70 transition-colors cursor-pointer group`}>
                  <Image src="/images/ethos.svg" alt="Ethos" width={24} height={24} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${trustLevelConfig.dot}`} />
                      <span className={`text-lg font-bold ${trustLevelConfig.text}`}>{ethosData.score}</span>
                    </div>
                    <div className="h-4 w-px bg-zinc-700" />
                    <span className={`text-sm font-semibold ${trustLevelConfig.text}`}>{trustLevelConfig.label}</span>
                  </div>
                  <svg className={`w-4 h-4 ${trustLevelConfig.text} opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </motion.div>
            )}

            {sellerStats && (sellerStats.salesCount > 0 || sellerStats.totalRevenue > 0) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="mt-6 grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-white">{sellerStats.salesCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Revenue</p>
                  <p className="text-2xl font-bold text-emerald-400">${sellerStats.totalRevenue.toFixed(2)}</p>
                </div>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-2 font-medium">Wallet Address</p>
              <p className="font-mono text-sm text-zinc-300 break-all">{address}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 flex flex-wrap gap-3">
              <CopyButton text={address} label="Copy Address" />
              <a href={getExplorerAddressUrl(address)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer text-sm font-medium text-zinc-300">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                View on Explorer
              </a>
              {displayInfo.resolvedType === "farcaster" && (
                <a href={`https://farcaster.xyz/${displayInfo.displayName}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer text-sm font-medium text-purple-300">
                  <Image src="/farcaster-logo.svg" alt="Farcaster" width={16} height={16} className="opacity-80" />
                  View on Farcaster
                </a>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Tabs Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-8">
          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-6">
            <button
              onClick={() => setActiveTab("listings")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === "listings"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>My Listings</span>
              {!listingsLoading && activeListings.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-xs font-semibold">
                  {activeListings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("purchases")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === "purchases"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Purchase History</span>
              {!purchasesLoading && purchases.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
                  {purchases.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "listings" ? (
              <motion.div
                key="listings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {listingsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => <div key={i} className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 h-24 animate-pulse" />)}
                  </div>
                ) : activeListings.length > 0 ? (
                  <div className="space-y-3">
                    {activeListings.map((listing) => (
                      <ListingCard key={listing._id} listing={listing} isOwner={isOwnProfile} onEdit={() => setEditingListing(listing)} onDelete={handleListingUpdate} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-zinc-500">{isOwnProfile ? "You haven't created any listings yet." : "This seller has no active listings."}</p>
                    {isOwnProfile && (
                      <Link href="/sell" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create a Listing
                      </Link>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="purchases"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {purchasesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 h-32 animate-pulse" />)}
                  </div>
                ) : purchases.length > 0 ? (
                  <div className="space-y-3">
                    {purchases.map((purchase) => (
                      <PurchaseCard key={purchase.id} purchase={purchase} sellerInfo={getSellerDisplayInfo(purchase.sellerAddress, resolvedSellers)} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-zinc-500">No purchases yet. Browse the marketplace to get started!</p>
                    <Link href="/apps" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Browse Marketplace
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>

      <AnimatePresence>
        {editingListing && <EditListingModal listing={editingListing} onClose={() => setEditingListing(null)} onUpdate={() => { handleListingUpdate(); setEditingListing(null); }} />}
      </AnimatePresence>
    </div>
  );
}



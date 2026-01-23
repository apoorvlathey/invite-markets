"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { blo } from "blo";
import {
  useResolveAddresses,
  getSellerDisplayInfo,
} from "@/lib/resolve-addresses";
import { getExplorerAddressUrl, chainId } from "@/lib/chain";
import {
  fetchEthosData,
  getTrustLevelConfig,
  type EthosData,
} from "@/lib/ethos-scores";
import { featuredApps } from "@/data/featuredApps";
import { useActiveAccount } from "thirdweb/react";
import { signMessage } from "thirdweb/utils";
import {
  getEIP712Domain,
  EIP712_UPDATE_TYPES,
  EIP712_DELETE_TYPES,
  type UpdateListingMessage,
  type DeleteListingMessage,
  type ListingType,
} from "@/lib/signature";
import { EthosRateButton } from "@/app/components/EthosRateButton";
import { useTheme } from "@/app/contexts/ThemeContext";

// Helper to resolve appId to proper app name
function getAppDisplayName(
  appId?: string,
  appName?: string,
  fallback?: string
): string {
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

// Data returned when revealing a purchased code
interface RevealedPurchaseData {
  listingType: ListingType;
  inviteUrl?: string;
  appUrl?: string;
  accessCode?: string;
}

interface Listing {
  _id: string;
  slug: string;
  listingType?: ListingType;
  // inviteUrl is only returned when authenticated as the seller (invite_link type)
  inviteUrl?: string;
  // appUrl is public for access_code type
  appUrl?: string;
  // accessCode is only returned when authenticated as the seller (access_code type)
  accessCode?: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  appId?: string;
  appName?: string;
  // Multi-use listing fields
  maxUses?: number; // -1 for unlimited, default: 1
  purchaseCount?: number; // default: 0
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface SellerStats {
  salesCount: number;
  totalRevenue: number;
}

function CopyButton({
  text,
  label,
  small = false,
}: {
  text: string;
  label: string;
  small?: boolean;
}) {
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

  const isIconOnly = !label;
  const iconSize = small ? "w-3 h-3" : "w-4 h-4";
  const buttonSize = small
    ? "w-6 h-6 rounded"
    : isIconOnly
    ? "w-10 h-10 rounded-lg"
    : "px-4 py-2.5 rounded-xl";

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center justify-center gap-2 bg-zinc-800/80 hover:bg-zinc-700 transition-all cursor-pointer text-sm font-medium ${buttonSize}`}
      title={isIconOnly ? (copied ? "Copied!" : "Copy Address") : undefined}
    >
      {copied ? (
        <>
          <svg
            className={`${iconSize} text-emerald-400`}
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
          {!isIconOnly && !small && (
            <span className="text-emerald-400">Copied!</span>
          )}
        </>
      ) : (
        <>
          <svg
            className={`${iconSize} text-zinc-400`}
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
          {!isIconOnly && !small && (
            <span className="text-zinc-300">{label}</span>
          )}
        </>
      )}
    </button>
  );
}

function EditListingModal({
  listing,
  onClose,
  onUpdate,
  account,
  chainId,
}: {
  listing: Listing;
  onClose: () => void;
  onUpdate: () => void;
  account: ReturnType<typeof useActiveAccount>;
  chainId: number;
}) {
  const listingType: ListingType = listing.listingType || "invite_link";
  const isAccessCode = listingType === "access_code";

  const [price, setPrice] = useState(listing.priceUsdc.toString());
  // inviteUrl is available when authenticated as the seller (invite_link type)
  const [inviteUrl, setInviteUrl] = useState(listing.inviteUrl || "");
  // appUrl is public for access_code type
  const [appUrl, setAppUrl] = useState(listing.appUrl || "");
  // accessCode is available when authenticated as the seller (access_code type)
  const [accessCode, setAccessCode] = useState(listing.accessCode || "");
  const [appName, setAppName] = useState(listing.appName || "");
  const [description, setDescription] = useState(listing.description || "");
  // Multi-use inventory fields
  const currentMaxUses = listing.maxUses ?? 1;
  const [maxUses, setMaxUses] = useState(
    currentMaxUses === -1 ? "1" : currentMaxUses.toString()
  );
  const [isUnlimitedUses, setIsUnlimitedUses] = useState(currentMaxUses === -1);
  const purchaseCount = listing.purchaseCount ?? 0;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSecretFocused, setIsSecretFocused] = useState(false);
  // Track if we have the original secret (for display purposes)
  const hasExistingSecret = isAccessCode
    ? !!listing.accessCode
    : !!listing.inviteUrl;

  // Disable background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!account) {
      setError("Please connect your wallet first");
      setIsLoading(false);
      return;
    }

    try {
      const nonce = BigInt(Date.now());
      const appNameValue = listing.appId ? "" : appName;
      // Calculate maxUses value: -1 for unlimited, or the entered number
      const maxUsesValue = isUnlimitedUses
        ? -1
        : parseInt(maxUses, 10) || currentMaxUses;

      const message: UpdateListingMessage = {
        slug: listing.slug,
        listingType,
        inviteUrl: isAccessCode ? "" : inviteUrl,
        appUrl: isAccessCode ? appUrl : "",
        accessCode: isAccessCode ? accessCode : "",
        priceUsdc: price,
        sellerAddress: account.address as `0x${string}`,
        appName: appNameValue,
        maxUses: maxUsesValue.toString(),
        description: description || "",
        nonce,
      };

      // Sign typed data using thirdweb account
      const signature = await account.signTypedData({
        domain: getEIP712Domain(chainId),
        types: EIP712_UPDATE_TYPES,
        primaryType: "UpdateListing" as const,
        message,
      });

      const response = await fetch("/api/listings/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: listing.slug,
          sellerAddress: account.address,
          priceUsdc: parseFloat(price),
          ...(isAccessCode ? { appUrl, accessCode } : { inviteUrl }),
          appName: listing.appId ? undefined : appName,
          maxUses: maxUsesValue,
          description: description.trim() || undefined,
          nonce: nonce.toString(),
          chainId,
          signature,
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
      if (err instanceof Error) {
        if (
          err.message.includes("User rejected") ||
          err.message.includes("user rejected")
        ) {
          setError(
            "Signature rejected. Please sign the message to update the listing."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(`Failed to update listing: ${err}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Edit Listing</h3>
            <span className="text-xs text-zinc-500">
              {isAccessCode ? "Access Code" : "Invite Link"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Price (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
          </div>

          {isAccessCode ? (
            <>
              {/* App URL - public */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  App URL
                </label>
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://app.example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-yellow-400">
                  This URL is publicly visible
                </p>
              </div>

              {/* Access Code - secret */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Access Code
                </label>
                <input
                  type={isSecretFocused ? "text" : "password"}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  onFocus={() => setIsSecretFocused(true)}
                  onBlur={() => setIsSecretFocused(false)}
                  placeholder={
                    hasExistingSecret
                      ? undefined
                      : "Leave empty to keep existing code"
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none font-mono"
                />
                {!hasExistingSecret && (
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Leave empty to keep the existing code unchanged.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Invite URL
              </label>
              <input
                type={isSecretFocused ? "text" : "password"}
                value={inviteUrl}
                onChange={(e) => setInviteUrl(e.target.value)}
                onFocus={() => setIsSecretFocused(true)}
                onBlur={() => setIsSecretFocused(false)}
                placeholder={
                  hasExistingSecret
                    ? undefined
                    : "Leave empty to keep existing URL"
                }
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none"
              />
              {!hasExistingSecret && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  Leave empty to keep the existing URL unchanged.
                </p>
              )}
            </div>
          )}

          {!listing.appId && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                App Name
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description{" "}
              <span className="text-zinc-500 font-normal text-xs">
                (Optional)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Add details about your invite or access code..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none resize-none"
            />
            <div className="mt-1.5 flex justify-between items-center">
              <p className="text-xs text-zinc-500">
                Provide additional context about what buyers will get
              </p>
              <span className="text-xs text-zinc-500">
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Max Uses (Inventory) - only show if not sold out */}
          {listing.status === "active" && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Number of Uses
              </label>
              <div className="space-y-3">
                {/* Current inventory status */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">
                      Current inventory:
                    </span>
                    <span className="text-sm font-medium text-cyan-400">
                      {purchaseCount} sold
                      {currentMaxUses === -1
                        ? " (unlimited)"
                        : ` of ${currentMaxUses}`}
                    </span>
                  </div>
                </div>

                {/* Unlimited Toggle */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isUnlimitedUses}
                      onChange={(e) => setIsUnlimitedUses(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 rounded-full bg-zinc-700 peer-checked:bg-cyan-500 transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-200 transition-colors">
                    Unlimited uses
                  </span>
                </label>

                {/* Number Input - hidden when unlimited */}
                {!isUnlimitedUses && (
                  <div>
                    <input
                      type="number"
                      min={Math.max(1, purchaseCount + 1)}
                      step="1"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Must be at least {purchaseCount + 1} (one more than
                      current purchases)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ViewCodeModal({
  purchase,
  revealedData,
  onClose,
}: {
  purchase: Purchase;
  revealedData: RevealedPurchaseData;
  onClose: () => void;
}) {
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedAccessCode, setCopiedAccessCode] = useState(false);

  const isAccessCode = revealedData.listingType === "access_code";

  // Disable background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleCopyInvite = async () => {
    if (!revealedData.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(revealedData.inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyAccessCode = async () => {
    if (!revealedData.accessCode) return;
    try {
      await navigator.clipboard.writeText(revealedData.accessCode);
      setCopiedAccessCode(true);
      setTimeout(() => setCopiedAccessCode(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Your Purchase</h3>
            <span className="text-xs text-zinc-500">
              {getAppDisplayName(purchase.appId, undefined, purchase.listingSlug)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        <div className="space-y-4">
          {isAccessCode ? (
            <>
              {/* App URL - for access code type */}
              {revealedData.appUrl && (
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-2 block">
                    App Link:
                  </label>
                  <a
                    href={revealedData.appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-all group"
                  >
                    <span className="text-sm font-medium truncate flex-1">
                      {revealedData.appUrl}
                    </span>
                    <svg
                      className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              )}

              {/* Access Code */}
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-2 block">
                  Your Access Code:
                </label>
                <div className="flex gap-2 items-stretch">
                  <div className="relative flex-1 p-[2px] rounded-lg bg-linear-to-r from-cyan-500 via-purple-500 to-cyan-500">
                    <input
                      type="text"
                      value={revealedData.accessCode || ""}
                      readOnly
                      className="relative w-full h-full px-3 py-2.5 bg-zinc-900 rounded-[6px] text-sm font-mono text-zinc-100 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleCopyAccessCode}
                    className={`px-4 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                      copiedAccessCode
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-100"
                    }`}
                  >
                    {copiedAccessCode ? (
                      <>
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
                        Copied!
                      </>
                    ) : (
                      <>
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
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Invite URL - for invite link type */
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">
                Your Invite Link:
              </label>
              <div className="flex gap-2 items-stretch">
                <div className="relative flex-1 p-[2px] rounded-lg bg-linear-to-r from-cyan-500 via-purple-500 to-cyan-500">
                  <input
                    type="text"
                    value={revealedData.inviteUrl || ""}
                    readOnly
                    className="relative w-full h-full px-3 py-2.5 bg-zinc-900 rounded-[6px] text-sm font-mono text-zinc-100 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCopyInvite}
                  className={`px-4 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                    copiedInvite
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                      : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-100"
                  }`}
                >
                  {copiedInvite ? (
                    <>
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
                      Copied!
                    </>
                  ) : (
                    <>
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
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Info notice */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500">
              This is the invite code you purchased. You can copy it anytime from your profile.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ListingCard({
  listing,
  isOwner,
  onEdit,
  onDelete,
  account,
  chainId,
  isAuthenticating = false,
}: {
  listing: Listing;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  account: ReturnType<typeof useActiveAccount>;
  chainId: number;
  isAuthenticating?: boolean;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    if (!account) {
      setDeleteError("Please connect your wallet first");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const nonce = BigInt(Date.now());

      const message: DeleteListingMessage = {
        slug: listing.slug,
        sellerAddress: account.address as `0x${string}`,
        nonce,
      };

      // Sign typed data using thirdweb account
      const signature = await account.signTypedData({
        domain: getEIP712Domain(chainId),
        types: EIP712_DELETE_TYPES,
        primaryType: "DeleteListing" as const,
        message,
      });

      const response = await fetch("/api/listings/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: listing.slug,
          sellerAddress: account.address,
          nonce: nonce.toString(),
          chainId,
          signature,
        }),
      });
      const data = await response.json();
      if (data.success) {
        onDelete();
      } else {
        setDeleteError(data.error || "Failed to delete listing");
      }
    } catch (err) {
      if (err instanceof Error) {
        if (
          err.message.includes("User rejected") ||
          err.message.includes("user rejected")
        ) {
          setDeleteError("Signature rejected");
        } else {
          setDeleteError(err.message);
        }
      } else {
        console.error("Failed to delete listing:", err);
        setDeleteError("Failed to delete listing");
      }
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-3 sm:p-4 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/listing/${listing.slug}`}
            className="text-sm sm:text-base font-semibold text-white hover:text-cyan-400 transition-colors block mb-2"
          >
            {getAppDisplayName(listing.appId, listing.appName, listing.slug)}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium text-emerald-400">
                ${listing.priceUsdc.toFixed(2)}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                listing.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : listing.status === "sold"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-zinc-500/10 text-zinc-400"
              }`}
            >
              {listing.status}
            </span>
            {/* Inventory Badge - only show for multi-use listings */}
            {(() => {
              const maxUses = listing.maxUses ?? 1;
              const purchaseCount = listing.purchaseCount ?? 0;
              const isUnlimited = maxUses === -1;
              const remaining = isUnlimited ? null : maxUses - purchaseCount;
              // Only show badge for multi-use or unlimited listings
              if (!isUnlimited && maxUses <= 1) return null;
              return (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                    isUnlimited
                      ? "bg-blue-500/10 text-blue-400"
                      : remaining === 1
                      ? "bg-yellow-500/10 text-yellow-400"
                      : remaining === 0
                      ? "bg-red-500/10 text-red-400"
                      : "bg-zinc-500/10 text-zinc-400"
                  }`}
                >
                  {isUnlimited
                    ? `${purchaseCount} sold (∞)`
                    : `${purchaseCount}/${maxUses} sold`}
                </span>
              );
            })()}
          </div>
        </div>

        {isOwner && listing.status === "active" && (
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={onEdit}
              disabled={isAuthenticating}
              className="p-1.5 sm:p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={isAuthenticating ? "Signing..." : "Edit listing"}
            >
              {isAuthenticating ? (
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-spin"
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
              ) : (
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 group-hover:text-cyan-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              disabled={isDeleting}
              className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all group cursor-pointer disabled:opacity-50"
              title="Delete listing"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 group-hover:text-red-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-zinc-800"
          >
            <p className="text-sm text-zinc-400 mb-3">
              Sign a message to confirm deletion
            </p>
            {deleteError && (
              <p className="text-sm text-red-400 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setDeleteError("");
                }}
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Signing..." : "Delete"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PurchaseCard({
  purchase,
  sellerInfo,
  isOwner,
  onViewCode,
  isRevealing = false,
}: {
  purchase: Purchase;
  sellerInfo: ReturnType<typeof getSellerDisplayInfo>;
  isOwner: boolean;
  onViewCode: () => void;
  isRevealing?: boolean;
}) {
  const date = new Date(purchase.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 hover:border-zinc-700 transition-colors"
    >
      {/* Full card link */}
      <Link
        href={`/listing/${purchase.listingSlug}`}
        className="absolute inset-0 z-0"
        aria-label={`View listing: ${getAppDisplayName(
          purchase.appId,
          undefined,
          purchase.listingSlug
        )}`}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className="text-base font-semibold text-white block mb-2">
            {getAppDisplayName(purchase.appId, undefined, purchase.listingSlug)}
          </span>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-500">Seller:</span>
            <Link
              href={`/profile/${purchase.sellerAddress}`}
              className="relative z-10 flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src={
                  sellerInfo.avatarUrl ||
                  blo(purchase.sellerAddress as `0x${string}`)
                }
                alt="Seller"
                width={20}
                height={20}
                className="rounded-full"
              />
              <span className="text-sm font-medium text-cyan-400">
                {sellerInfo.displayName}
              </span>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium text-emerald-400">
                ${purchase.priceUsdc.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-2">
          {/* View Code button - only shown to the owner */}
          {isOwner && (
            <button
              onClick={onViewCode}
              disabled={isRevealing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={isRevealing ? "Signing..." : "View your purchased code"}
            >
              {isRevealing ? (
                <svg
                  className="w-4 h-4 text-purple-400 animate-spin"
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
              ) : (
                <svg
                  className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
              <span className="text-xs font-medium text-purple-400 group-hover:text-purple-300 transition-colors">
                {isRevealing ? "Signing..." : "View Code"}
              </span>
            </button>
          )}
          <a
            href={`https://app.ethos.network/profile/${purchase.sellerAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all group"
            title="Review seller on Ethos"
          >
            <Image
              src="/images/ethos.svg"
              alt="Ethos"
              width={16}
              height={16}
              className="opacity-70 group-hover:opacity-100 transition-opacity"
            />
            <span className="text-xs font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
              Review
            </span>
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default function ProfileClient({ address }: ProfileClientProps) {
  const router = useRouter();
  const { resolvedAddresses, isLoading } = useResolveAddresses([address]);
  const displayInfo = getSellerDisplayInfo(address, resolvedAddresses);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [ethosData, setEthosData] = useState<EthosData | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [sellerAddresses, setSellerAddresses] = useState<string[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [activeTab, setActiveTab] = useState<"listings" | "purchases">(
    "listings"
  );
  // State for viewing purchased codes
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [revealedData, setRevealedData] = useState<RevealedPurchaseData | null>(
    null
  );
  const [revealingPurchaseId, setRevealingPurchaseId] = useState<string | null>(
    null
  );
  const account = useActiveAccount();
  // Always use the server-configured chainId, not the wallet's connected chain

  const isOwnProfile =
    address?.toLowerCase() === account?.address.toLowerCase();
  const { resolvedAddresses: resolvedSellers } =
    useResolveAddresses(sellerAddresses);
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
          const sellers = [
            ...new Set(data.purchases.map((p: Purchase) => p.sellerAddress)),
          ] as string[];
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

  // Store auth data for authenticated seller requests with caching
  // Includes wallet address and timestamp to validate cache
  const authDataRef = useRef<{
    signature: string;
    message: string;
    walletAddress: string;
    createdAt: number;
  } | null>(null);
  const [authenticatingListingId, setAuthenticatingListingId] = useState<
    string | null
  >(null);

  // Store auth data for authenticated buyer requests (for viewing purchased codes)
  // Separate from seller auth since message format is different
  const buyerAuthDataRef = useRef<{
    signature: string;
    message: string;
    walletAddress: string;
    createdAt: number;
  } | null>(null);

  // Check if cached auth is still valid
  const isAuthCacheValid = useCallback(() => {
    // Cache validity duration (5 minutes in milliseconds)
    const AUTH_CACHE_DURATION = 5 * 60 * 1000;

    if (!authDataRef.current || !account) return false;

    const { walletAddress, createdAt } = authDataRef.current;
    const now = Date.now();

    // Validate: same wallet and within cache duration
    const isSameWallet =
      walletAddress.toLowerCase() === account.address.toLowerCase();
    const isNotExpired = now - createdAt < AUTH_CACHE_DURATION;

    return isSameWallet && isNotExpired;
  }, [account]);

  // Clear auth cache when wallet changes
  useEffect(() => {
    if (authDataRef.current && account) {
      const cachedWallet = authDataRef.current.walletAddress.toLowerCase();
      const currentWallet = account.address.toLowerCase();

      if (cachedWallet !== currentWallet) {
        // Wallet changed, clear the cache
        authDataRef.current = null;
      }
    }
    // Also clear buyer auth cache
    if (buyerAuthDataRef.current && account) {
      const cachedWallet = buyerAuthDataRef.current.walletAddress.toLowerCase();
      const currentWallet = account.address.toLowerCase();

      if (cachedWallet !== currentWallet) {
        buyerAuthDataRef.current = null;
      }
    }
  }, [account]);

  // Check if cached buyer auth is still valid
  const isBuyerAuthCacheValid = useCallback(() => {
    const AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    if (!buyerAuthDataRef.current || !account) return false;

    const { walletAddress, createdAt } = buyerAuthDataRef.current;
    const now = Date.now();

    const isSameWallet =
      walletAddress.toLowerCase() === account.address.toLowerCase();
    const isNotExpired = now - createdAt < AUTH_CACHE_DURATION;

    return isSameWallet && isNotExpired;
  }, [account]);

  // Function to fetch seller data with optional authentication
  const fetchSellerData = useCallback(
    async (authenticate: boolean = false): Promise<Listing[] | null> => {
      try {
        const headers: HeadersInit = {};

        // If authenticated and we have valid auth data, include it
        if (authenticate && authDataRef.current) {
          headers["x-seller-signature"] = authDataRef.current.signature;
          headers["x-seller-message"] = btoa(authDataRef.current.message);
        }

        const response = await fetch(`/api/seller/${address}`, { headers });
        const data = await response.json();
        if (data.success) {
          setListings(data.listings || []);
          setSellerStats(data.stats);
          return data.listings || [];
        }
        return null;
      } catch (error) {
        console.error("Failed to fetch seller data:", error);
        return null;
      } finally {
        setListingsLoading(false);
      }
    },
    [address]
  );

  // Fetch seller data on page load (without authentication)
  useEffect(() => {
    fetchSellerData(false);
  }, [address, fetchSellerData]);

  // Handle edit button click - use cached auth or request new signature
  const handleEditClick = useCallback(
    async (listing: Listing) => {
      if (!account) return;

      setAuthenticatingListingId(listing._id);

      try {
        // Check if we have valid cached auth
        if (isAuthCacheValid()) {
          // Use cached auth - just fetch and open modal
          const authenticatedListings = await fetchSellerData(true);

          if (authenticatedListings) {
            const authenticatedListing = authenticatedListings.find(
              (l) => l._id === listing._id
            );
            if (authenticatedListing) {
              setEditingListing(authenticatedListing);
            }
          }
          setAuthenticatingListingId(null);
          return;
        }

        // No valid cache - request new signature
        const timestamp = Date.now();
        const message = `Edit my listing on invite.markets\nTimestamp: ${timestamp}\nAddress: ${account.address}`;

        const signature = await signMessage({
          account,
          message,
        });

        // Store with wallet address and timestamp for cache validation
        authDataRef.current = {
          signature,
          message,
          walletAddress: account.address,
          createdAt: timestamp,
        };

        // Fetch authenticated data to get inviteUrl
        const authenticatedListings = await fetchSellerData(true);

        if (authenticatedListings) {
          // Find the listing with inviteUrl included
          const authenticatedListing = authenticatedListings.find(
            (l) => l._id === listing._id
          );
          if (authenticatedListing) {
            setEditingListing(authenticatedListing);
          }
        }
      } catch (error) {
        // User rejected signature - don't open modal
        console.log("Edit authentication cancelled:", error);
      } finally {
        setAuthenticatingListingId(null);
      }
    },
    [account, fetchSellerData, isAuthCacheValid]
  );

  const handleListingUpdate = useCallback(() => {
    // Re-fetch with auth if cache is still valid
    fetchSellerData(isAuthCacheValid());
  }, [fetchSellerData, isAuthCacheValid]);

  // Handle view code button click - use cached auth or request new signature
  const handleViewCodeClick = useCallback(
    async (purchase: Purchase) => {
      if (!account) return;

      setRevealingPurchaseId(purchase.id);

      try {
        let signature: string;
        let message: string;

        // Check if we have valid cached buyer auth
        if (isBuyerAuthCacheValid() && buyerAuthDataRef.current) {
          signature = buyerAuthDataRef.current.signature;
          message = buyerAuthDataRef.current.message;
        } else {
          // No valid cache - request new signature
          const timestamp = Date.now();
          message = `View my purchase on invite.markets\nTimestamp: ${timestamp}\nAddress: ${account.address}`;

          signature = await signMessage({
            account,
            message,
          });

          // Store with wallet address and timestamp for cache validation
          buyerAuthDataRef.current = {
            signature,
            message,
            walletAddress: account.address,
            createdAt: timestamp,
          };
        }

        // Call the reveal API
        const response = await fetch("/api/buyer/reveal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: purchase.id,
            signature,
            message: btoa(message),
          }),
        });

        const data = await response.json();

        if (data.success) {
          setRevealedData(data);
          setViewingPurchase(purchase);
        } else {
          console.error("Failed to reveal purchase:", data.error);
          // If auth failed, clear the cache so user can try again
          if (response.status === 401) {
            buyerAuthDataRef.current = null;
          }
        }
      } catch (error) {
        // User rejected signature - don't show modal
        console.log("View code authentication cancelled:", error);
      } finally {
        setRevealingPurchaseId(null);
      }
    },
    [account, isBuyerAuthCacheValid]
  );

  const trustLevelConfig = ethosData
    ? getTrustLevelConfig(ethosData.level)
    : null;
  const activeListings = listings.filter((l) => l.status === "active");

  return (
    <div className="min-h-screen text-zinc-100">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "6s", animationDelay: "1s" }}
        />
      </div>

      <div className="max-w-2xl mx-auto py-8 sm:py-12 md:py-16 px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-zinc-950 border border-zinc-800 shadow-premium overflow-hidden"
        >
          <div 
            className="h-28 sm:h-36 relative overflow-hidden"
            style={{ background: isLight ? '#f4f4f5' : '#09090b' }}
          >
            {/* Tiled Avatar Pattern Background */}
            <div
              className="absolute grid grid-cols-6 sm:grid-cols-10 gap-3 sm:gap-4"
              style={{
                transform: "rotate(-20deg) scale(1.8)",
                transformOrigin: "center center",
                top: "-50%",
                left: "-25%",
                right: "-25%",
                bottom: "-50%",
                opacity: isLight ? 0.25 : 0.15,
              }}
            >
              {[...Array(70)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayInfo.avatarUrl || bloAvatar}
                    alt=""
                    className="w-full h-full rounded-lg sm:rounded-xl object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Radial gradient for centered glow */}
            <div
              className="absolute inset-0"
              style={{
                background: isLight 
                  ? `radial-gradient(ellipse at center, transparent 0%, rgba(244, 244, 245, 0.3) 50%, rgba(244, 244, 245, 0.85) 100%)`
                  : `radial-gradient(ellipse at center, transparent 0%, rgba(9, 9, 11, 0.4) 50%, rgba(9, 9, 11, 0.9) 100%)`,
              }}
            />

            {/* Vignette Effects - theme aware */}
            <div 
              className="absolute inset-0" 
              style={{ 
                background: isLight 
                  ? 'linear-gradient(to bottom, rgba(244,244,245,0.5), transparent 50%, rgba(244,244,245,0.85))'
                  : 'linear-gradient(to bottom, rgba(9, 9, 11, 0.7), transparent, rgba(9, 9, 11, 0.9))' 
              }} 
            />
            <div 
              className="absolute inset-0" 
              style={{ 
                background: isLight
                  ? 'linear-gradient(to right, rgba(244,244,245,0.5), transparent, rgba(244,244,245,0.5))'
                  : 'linear-gradient(to right, rgba(9, 9, 11, 0.7), transparent, rgba(9, 9, 11, 0.7))' 
              }} 
            />

            {/* Subtle color accent based on resolution type */}
            <div
              className="absolute inset-0"
              style={{
                background: isLight
                  ? displayInfo.resolvedType === "farcaster"
                    ? 'rgba(168, 85, 247, 0.15)'
                    : displayInfo.resolvedType === "basename"
                    ? 'rgba(59, 130, 246, 0.15)'
                    : displayInfo.resolvedType === "ens"
                    ? 'rgba(6, 182, 212, 0.15)'
                    : 'rgba(6, 182, 212, 0.12)'
                  : undefined,
                mixBlendMode: isLight ? 'normal' : 'overlay',
              }}
            />
            {!isLight && (
              <div
                className={`absolute inset-0 mix-blend-overlay ${
                  displayInfo.resolvedType === "farcaster"
                    ? "bg-purple-500/10"
                    : displayInfo.resolvedType === "basename"
                    ? "bg-blue-500/10"
                    : displayInfo.resolvedType === "ens"
                    ? "bg-cyan-500/10"
                    : "bg-cyan-500/8"
                }`}
              />
            )}
          </div>

          <div className="px-4 sm:px-6 md:px-8 -mt-14 sm:-mt-16 relative z-10">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden border-4 border-zinc-950 shadow-xl">
                {isLoading ? (
                  <div className="w-full h-full bg-zinc-800 animate-pulse" />
                ) : (
                  <Image
                    src={displayInfo.avatarUrl || bloAvatar}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {displayInfo.resolvedType && (
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-medium text-cyan-400 capitalize">
                  {displayInfo.resolvedType}
                </div>
              )}
            </motion.div>
          </div>

          <div className="px-4 sm:px-6 md:px-8 pt-3 sm:pt-4 pb-6 sm:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {isLoading ? (
                <div className="h-7 sm:h-8 w-40 sm:w-48 bg-zinc-800 rounded-lg animate-pulse mb-2" />
              ) : (
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 break-all">
                  {displayInfo.resolvedType === "farcaster" && "@"}
                  {displayInfo.displayName}
                </h1>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-zinc-500 font-mono truncate max-w-[200px] sm:max-w-none">
                  {address}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <CopyButton text={address} label="" small />
                  <a
                    href={getExplorerAddressUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800/80 hover:bg-zinc-700 transition-all cursor-pointer"
                    title="View on Explorer"
                  >
                    <svg
                      className="w-3 h-3 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                  {displayInfo.resolvedType === "farcaster" && (
                    <a
                      href={`https://farcaster.xyz/${displayInfo.displayName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-6 h-6 rounded bg-purple-500/20 hover:bg-purple-500/30 transition-all cursor-pointer"
                      title="View on Farcaster"
                    >
                      <Image
                        src="/farcaster-logo.svg"
                        alt="Farcaster"
                        width={12}
                        height={12}
                        className="opacity-80"
                      />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-4 sm:mt-6 flex flex-wrap items-stretch gap-2 sm:gap-3"
            >
              {/* Ethos Score */}
              {ethosData && trustLevelConfig && (
                <a
                  href={`https://app.ethos.network/profile/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl ${trustLevelConfig.bg} border ${trustLevelConfig.border} hover:border-opacity-70 transition-colors cursor-pointer group`}
                >
                  <Image
                    src="/images/ethos.svg"
                    alt="Ethos"
                    width={24}
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6 opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${trustLevelConfig.dot}`}
                      />
                      <span
                        className={`text-base sm:text-lg font-bold ${trustLevelConfig.text}`}
                      >
                        {ethosData.score}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-zinc-700" />
                    <span
                      className={`text-xs sm:text-sm font-semibold ${trustLevelConfig.text}`}
                    >
                      {trustLevelConfig.label}
                    </span>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${trustLevelConfig.text} opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-0.5 sm:ml-1`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}

              {/* Rate on Ethos button */}
              <EthosRateButton
                address={address}
                label="Rate on Ethos"
                className="rounded-xl"
              />
            </motion.div>

            {sellerStats &&
              (sellerStats.salesCount > 0 || sellerStats.totalRevenue > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38 }}
                  className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-3"
                >
                  <div className="p-3 sm:p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <p className="text-[10px] sm:text-xs text-zinc-500 mb-1">
                      Total Sales
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-white">
                      {sellerStats.salesCount}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <p className="text-[10px] sm:text-xs text-zinc-500 mb-1">
                      Revenue
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                      ${sellerStats.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                </motion.div>
              )}
          </div>
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-4 sm:mb-6">
            <button
              onClick={() => setActiveTab("listings")}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === "listings"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span>Listings</span>
              {!listingsLoading && activeListings.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] sm:text-xs font-semibold">
                  {activeListings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("purchases")}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === "purchases"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
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
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="hidden sm:inline">Purchase History</span>
              <span className="sm:hidden">Purchases</span>
              {!purchasesLoading && purchases.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 text-[10px] sm:text-xs font-semibold">
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
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 h-24 animate-pulse"
                      />
                    ))}
                  </div>
                ) : activeListings.length > 0 ? (
                  <div className="space-y-3">
                    {activeListings.map((listing) => (
                      <ListingCard
                        key={listing._id}
                        listing={listing}
                        isOwner={isOwnProfile}
                        onEdit={() => handleEditClick(listing)}
                        onDelete={handleListingUpdate}
                        account={account}
                        chainId={chainId}
                        isAuthenticating={
                          authenticatingListingId === listing._id
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-zinc-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <p className="text-zinc-500">
                      {isOwnProfile
                        ? "You haven't created any listings yet."
                        : "This seller has no active listings."}
                    </p>
                    {isOwnProfile && (
                      <Link
                        href="/sell"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors cursor-pointer"
                      >
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
                            d="M12 4v16m8-8H4"
                          />
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
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 h-32 animate-pulse"
                      />
                    ))}
                  </div>
                ) : purchases.length > 0 ? (
                  <div className="space-y-3">
                    {purchases.map((purchase) => (
                      <PurchaseCard
                        key={purchase.id}
                        purchase={purchase}
                        sellerInfo={getSellerDisplayInfo(
                          purchase.sellerAddress,
                          resolvedSellers
                        )}
                        isOwner={isOwnProfile}
                        onViewCode={() => handleViewCodeClick(purchase)}
                        isRevealing={revealingPurchaseId === purchase.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-zinc-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                    </div>
                    <p className="text-zinc-500">
                      No purchases yet. Browse the marketplace to get started!
                    </p>
                    <Link
                      href="/apps"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors cursor-pointer"
                    >
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
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
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
        {editingListing && (
          <EditListingModal
            listing={editingListing}
            onClose={() => setEditingListing(null)}
            onUpdate={() => {
              handleListingUpdate();
              setEditingListing(null);
            }}
            account={account}
            chainId={chainId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPurchase && revealedData && (
          <ViewCodeModal
            purchase={viewingPurchase}
            revealedData={revealedData}
            onClose={() => {
              setViewingPurchase(null);
              setRevealedData(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

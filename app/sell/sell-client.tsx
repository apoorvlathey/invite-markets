"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  getEIP712Domain,
  EIP712_TYPES,
  type ListingMessage,
} from "@/lib/signature";
import { featuredApps } from "@/data/featuredApps";
import { LISTINGS_QUERY_KEY } from "@/hooks/usePurchase";
import { type Listing, type ListingsData } from "@/lib/listings";
import { chainId as defaultChainId } from "@/lib/chain";

export default function SellClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const address = account?.address;
  const isConnected = !!account;
  const chainId = chain?.id ?? defaultChainId;

  const [formData, setFormData] = useState({
    inviteUrl: "",
    priceUsdc: "",
    appInput: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedApp, setSelectedApp] = useState<{
    id: string;
    appName: string;
  } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isValueConfirmed, setIsValueConfirmed] = useState(false);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inviteUrlInputRef = useRef<HTMLInputElement>(null);

  // Filter featured apps based on input
  const filteredApps = featuredApps.filter((app) =>
    app.appName.toLowerCase().includes(formData.appInput.toLowerCase())
  );

  // Create dropdown items list (featured apps + custom app if no matches)
  const dropdownItems =
    filteredApps.length > 0
      ? filteredApps
      : formData.appInput
      ? [{ id: "custom", appName: formData.appInput }]
      : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset highlighted index when dropdown items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [dropdownItems.length, formData.appInput]);

  // Fetch lowest price when app is confirmed
  useEffect(() => {
    if (!isValueConfirmed || !formData.appInput) {
      setLowestPrice(null);
      return;
    }

    const fetchLowestPrice = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedApp) {
          params.set("appId", selectedApp.id);
        } else {
          params.set("appName", formData.appInput.trim());
        }

        const response = await fetch(`/api/listings/lowest-price?${params}`);
        const data = await response.json();

        if (data.success) {
          setLowestPrice(data.lowestPrice);
        }
      } catch (error) {
        console.error("Error fetching lowest price:", error);
        setLowestPrice(null);
      }
    };

    fetchLowestPrice();
  }, [isValueConfirmed, selectedApp, formData.appInput]);

  // Auto-redirect after 5 seconds when listing is created
  useEffect(() => {
    if (createdSlug) {
      const timer = setTimeout(() => {
        router.push(`/listing/${createdSlug}`);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [createdSlug, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isConnected || !address || !account) {
      setError("Please connect your wallet first");
      return;
    }

    if (!formData.appInput.trim()) {
      setError("Please enter an app name");
      return;
    }

    setIsSubmitting(true);

    try {
      const nonce = BigInt(Date.now());

      const message: ListingMessage = {
        inviteUrl: formData.inviteUrl,
        priceUsdc: formData.priceUsdc,
        sellerAddress: address as `0x${string}`,
        appId: selectedApp ? selectedApp.id : "",
        appName: selectedApp ? "" : formData.appInput.trim(),
        nonce,
      };

      // Sign typed data using thirdweb account
      const signature = await account.signTypedData({
        domain: getEIP712Domain(chainId),
        types: EIP712_TYPES,
        primaryType: "CreateListing" as const,
        message,
      });

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteUrl: formData.inviteUrl,
          priceUsdc: parseFloat(formData.priceUsdc),
          sellerAddress: address,
          nonce: nonce.toString(),
          chainId,
          signature,
          // Send appId for featured apps, appName for custom apps
          ...(selectedApp
            ? { appId: selectedApp.id }
            : { appName: formData.appInput.trim() }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create listing");
      }

      // Add the new listing to the cache immediately so listing page shows it
      const newListing: Listing = {
        slug: data.listing.slug,
        priceUsdc: data.listing.priceUsdc,
        sellerAddress: data.listing.sellerAddress,
        status: data.listing.status,
        appId: data.listing.appId,
        appName: data.listing.appName,
        createdAt: data.listing.createdAt,
        updatedAt: data.listing.createdAt,
      };

      queryClient.setQueryData<ListingsData>(LISTINGS_QUERY_KEY, (old) => {
        if (!old) {
          return {
            invites: [],
            rawListings: [newListing],
          };
        }
        return {
          ...old,
          rawListings: [newListing, ...old.rawListings],
        };
      });

      setCreatedSlug(data.listing.slug);
    } catch (err) {
      if (err instanceof Error) {
        if (
          err.message.includes("User rejected") ||
          err.message.includes("user rejected")
        ) {
          setError(
            "Signature rejected. Please sign the message to create a listing."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to create listing");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (createdSlug) {
    return (
      <div className="min-h-screen text-zinc-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-premium p-10"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-8"
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-linear-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center relative">
                <svg
                  className="w-12 h-12 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-bold mb-3 bg-linear-to-br from-white to-zinc-400 bg-clip-text text-transparent">
              Listing Created!
            </h2>
            <p className="text-zinc-400 mb-10 text-lg">
              Your invite is now live on the marketplace
            </p>
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/listing/${createdSlug}`)}
                className="group relative w-full rounded-xl py-3.5 px-6 font-semibold overflow-hidden cursor-pointer"
              >
                {/* Dark background */}
                <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm border border-white/10 pointer-events-none" />
                {/* Gradient overlay that reveals as animation progresses */}
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-cyan-500 to-blue-500 pointer-events-none"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 5, ease: "linear" }}
                  style={{ transformOrigin: "left" }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  View Your Listing
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
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setCreatedSlug("");
                  setFormData({ inviteUrl: "", priceUsdc: "", appInput: "" });
                  setSelectedApp(null);
                  setIsValueConfirmed(false);
                }}
                className="w-full rounded-xl py-4 px-6 font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer"
              >
                Create Another Listing
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-100">
      <div className="max-w-3xl mx-auto py-16 px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-linear-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            List Your Invite
          </h1>
          <p className="text-lg text-zinc-400">
            Sell your exclusive invite link and earn instantly
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-zinc-950 border border-zinc-800 shadow-premium p-8 md:p-10"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* App Name Input with Dropdown */}
            <div>
              <label
                htmlFor="appInput"
                className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3"
              >
                <svg
                  className="w-4 h-4 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                App Name
              </label>
              <div className="relative" ref={dropdownRef}>
                {!isValueConfirmed ? (
                  <div className="relative">
                    <input
                      type="text"
                      id="appInput"
                      name="appInput"
                      value={formData.appInput}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          appInput: e.target.value,
                        }));
                        setShowDropdown(true);
                        setSelectedApp(null);
                        setIsValueConfirmed(false);
                      }}
                      onFocus={() => {
                        setShowDropdown(true);
                        setIsValueConfirmed(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightedIndex((prev) =>
                            prev < dropdownItems.length - 1 ? prev + 1 : prev
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightedIndex((prev) =>
                            prev > 0 ? prev - 1 : 0
                          );
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          if (dropdownItems.length > 0) {
                            const selected = dropdownItems[highlightedIndex];
                            if (selected.id !== "custom") {
                              setSelectedApp(selected);
                            } else {
                              setSelectedApp(null);
                            }
                            setFormData((prev) => ({
                              ...prev,
                              appInput: selected.appName,
                            }));
                            setIsValueConfirmed(true);
                            setShowDropdown(false);
                            // Focus next input field
                            setTimeout(() => {
                              inviteUrlInputRef.current?.focus();
                            }, 0);
                          }
                        } else if (e.key === "Escape") {
                          setShowDropdown(false);
                        }
                      }}
                      required
                      placeholder="Type app name or select from featured..."
                      className="w-full px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-150 hover:border-zinc-600"
                    />
                    {selectedApp && !showDropdown && (
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-400 font-medium">
                        Featured
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600">
                      <span className="text-zinc-100 font-medium">
                        {formData.appInput}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsValueConfirmed(false);
                          setFormData((prev) => ({
                            ...prev,
                            appInput: "",
                          }));
                          setSelectedApp(null);
                        }}
                        className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Dropdown */}
                <AnimatePresence>
                  {showDropdown && dropdownItems.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 w-full mt-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto">
                        {dropdownItems.map((item, index) => {
                          const isFeatured = item.id !== "custom";
                          const isHighlighted = index === highlightedIndex;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                if (isFeatured) {
                                  setSelectedApp(item);
                                } else {
                                  setSelectedApp(null);
                                }
                                setFormData((prev) => ({
                                  ...prev,
                                  appInput: item.appName,
                                }));
                                setIsValueConfirmed(true);
                                setShowDropdown(false);
                              }}
                              onMouseEnter={() => setHighlightedIndex(index)}
                              className={`w-full px-5 py-3 text-left transition-colors flex items-center justify-between group cursor-pointer ${
                                isHighlighted
                                  ? "bg-zinc-800"
                                  : "hover:bg-zinc-800/50"
                              }`}
                            >
                              <span className="text-zinc-100 font-medium">
                                {item.appName}
                              </span>
                              {isFeatured ? (
                                <span
                                  className={`px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-400 font-medium transition-all ${
                                    isHighlighted
                                      ? "bg-cyan-500/30"
                                      : "group-hover:bg-cyan-500/30"
                                  }`}
                                >
                                  Featured
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-500">
                                  Press Enter to select
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div>
              <label
                htmlFor="inviteUrl"
                className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3"
              >
                <svg
                  className="w-4 h-4 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Invite URL
              </label>
              <input
                type="url"
                id="inviteUrl"
                name="inviteUrl"
                ref={inviteUrlInputRef}
                value={formData.inviteUrl}
                onChange={handleChange}
                required
                placeholder="https://app.example.com/invite/..."
                className="w-full px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-150 hover:border-zinc-600"
              />
              <p className="mt-2 text-xs text-zinc-500">
                The unique invite link you want to sell
              </p>
            </div>

            <div>
              <label
                htmlFor="priceUsdc"
                className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3"
              >
                <svg
                  className="w-4 h-4 text-cyan-400"
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
                Price (USDC)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="priceUsdc"
                  name="priceUsdc"
                  value={formData.priceUsdc}
                  onChange={handleChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                  min="0"
                  step="0.01"
                  placeholder="1.00"
                  className="w-full px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-150 hover:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">
                  USDC
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Set a competitive price for your invite
              </p>
              <AnimatePresence>
                {isValueConfirmed && lowestPrice !== null && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-2 text-xs text-cyan-400 flex items-center gap-1.5"
                  >
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
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Current lowest listing price for {formData.appInput} is $
                    {lowestPrice.toFixed(2)}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {isConnected && address && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-zinc-900/80 border border-cyan-500/30 p-5"
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-300 mb-1">
                      <span className="font-semibold">Payment recipient:</span>
                    </p>
                    <p className="font-mono text-cyan-400 text-sm break-all">
                      {address}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Fee Info */}
            <p className="text-xs text-zinc-500 text-center">
              Fees: 5% platform · 0.3% facilitator
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-zinc-900/80 border border-red-500/30 p-5"
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-400 mt-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: isConnected && !isSubmitting ? 1.02 : 1 }}
              whileTap={{ scale: isConnected && !isSubmitting ? 0.98 : 1 }}
              type="submit"
              disabled={isSubmitting || !isConnected}
              className="group relative w-full rounded-xl py-4 px-6 font-bold text-lg overflow-hidden disabled:cursor-not-allowed cursor-pointer"
            >
              {isConnected && !isSubmitting ? (
                <>
                  <div className="absolute inset-0 bg-linear-to-r from-cyan-500 to-blue-500 transition-transform group-hover:scale-110" />
                  <span className="relative z-10 text-black flex items-center justify-center gap-2">
                    Create Listing
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
                  </span>
                  <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-linear-to-r from-cyan-500 to-blue-500" />
                </>
              ) : isSubmitting ? (
                <>
                  <div className="absolute inset-0 bg-linear-to-r from-cyan-500 to-blue-500" />
                  <span className="relative z-10 text-black flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <motion.div
                        className="w-1 bg-black rounded-full"
                        animate={{
                          height: ["12px", "24px", "12px"],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <motion.div
                        className="w-1 bg-black rounded-full"
                        animate={{
                          height: ["12px", "24px", "12px"],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.2,
                        }}
                      />
                      <motion.div
                        className="w-1 bg-black rounded-full"
                        animate={{
                          height: ["12px", "24px", "12px"],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.4,
                        }}
                      />
                    </div>
                    Creating Listing...
                  </span>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-zinc-800" />
                  <span className="relative z-10 text-zinc-400">
                    {!isConnected
                      ? "Connect Wallet to Continue"
                      : "Create Listing"}
                  </span>
                </>
              )}
            </motion.button>
          </form>

          {/* Info section */}
          <div className="mt-10 pt-8 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              How it works
            </h3>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-cyan-400">
                  1
                </span>
                <span>Sign the message to create your listing</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-cyan-400">
                  2
                </span>
                <span>Buyers discover your invite on the marketplace</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-cyan-400">
                  3
                </span>
                <span>Receive instant payment when someone purchases</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


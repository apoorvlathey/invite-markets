"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createThirdwebClient } from "thirdweb";
import {
  useActiveAccount,
  useActiveWalletChain,
  useConnectModal,
} from "thirdweb/react";
import { base, baseSepolia } from "thirdweb/chains";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  getEIP712Domain,
  EIP712_TYPES,
  type ListingMessage,
  type ListingType,
} from "@/lib/signature";
import { featuredApps } from "@/data/featuredApps";
import { LISTINGS_QUERY_KEY } from "@/hooks/usePurchase";
import { type Listing, type ListingsData } from "@/lib/listings";
import { chainId as defaultChainId } from "@/lib/chain";

const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === "true";
const thirdwebChain = isTestnet ? baseSepolia : base;

const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

interface ExistingApp {
  id: string;
  name: string;
  iconUrl: string;
  isFeatured: boolean;
}

export default function SellClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const { connect } = useConnectModal();
  const address = account?.address;
  const isConnected = !!account;
  const chainId = chain?.id ?? defaultChainId;

  // Listing type state
  const [listingType, setListingType] = useState<ListingType>("invite_link");

  const [formData, setFormData] = useState({
    inviteUrl: "",
    appUrl: "",
    accessCode: "",
    priceUsdc: "",
    appInput: "",
    maxUses: "1", // Default to single use
  });
  const [isUnlimitedUses, setIsUnlimitedUses] = useState(false);
  const [isUsesExpanded, setIsUsesExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedApp, setSelectedApp] = useState<{
    id: string;
    appName: string;
    appIconUrl?: string;
  } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isValueConfirmed, setIsValueConfirmed] = useState(false);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);
  const [existingApps, setExistingApps] = useState<ExistingApp[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inviteUrlInputRef = useRef<HTMLInputElement>(null);
  const appUrlInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing apps on mount
  useEffect(() => {
    const fetchExistingApps = async () => {
      try {
        const response = await fetch("/api/apps");
        const data = await response.json();
        if (data.success) {
          // Filter out featured apps (we show them separately)
          const nonFeaturedApps = data.apps.filter(
            (app: ExistingApp) => !app.isFeatured
          );
          setExistingApps(nonFeaturedApps);
        }
      } catch (error) {
        console.error("Error fetching existing apps:", error);
      }
    };

    fetchExistingApps();
  }, []);

  // Filter featured apps based on input
  const filteredFeaturedApps = featuredApps.filter((app) =>
    app.appName.toLowerCase().includes(formData.appInput.toLowerCase())
  );

  // Filter existing apps based on input
  const filteredExistingApps = existingApps.filter((app) =>
    app.name.toLowerCase().includes(formData.appInput.toLowerCase())
  );

  // Create dropdown items list with sections
  const dropdownItems = useMemo(() => {
    const items: {
      id: string;
      appName: string;
      appIconUrl?: string;
      section: "featured" | "existing" | "custom";
    }[] = [];

    // Add filtered featured apps
    for (const app of filteredFeaturedApps) {
      items.push({
        id: app.id,
        appName: app.appName,
        appIconUrl: app.appIconUrl,
        section: "featured",
      });
    }

    // Add filtered existing apps
    for (const app of filteredExistingApps) {
      items.push({
        id: app.id,
        appName: app.name,
        appIconUrl: app.iconUrl,
        section: "existing",
      });
    }

    // Add custom option if no matches and there's input
    if (items.length === 0 && formData.appInput) {
      items.push({
        id: "custom",
        appName: formData.appInput,
        section: "custom",
      });
    }

    return items;
  }, [filteredFeaturedApps, filteredExistingApps, formData.appInput]);

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

    // Validate based on listing type
    if (listingType === "invite_link" && !formData.inviteUrl) {
      setError("Please enter an invite URL");
      return;
    }

    if (listingType === "access_code") {
      if (!formData.appUrl) {
        setError("Please enter the app URL");
        return;
      }
      if (!formData.accessCode) {
        setError("Please enter the access code");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const nonce = BigInt(Date.now());

      // Calculate maxUses value: -1 for unlimited, or the entered number
      const maxUsesValue = isUnlimitedUses ? -1 : parseInt(formData.maxUses, 10) || 1;

      const message: ListingMessage = {
        listingType,
        inviteUrl: listingType === "invite_link" ? formData.inviteUrl : "",
        appUrl: listingType === "access_code" ? formData.appUrl : "",
        accessCode: listingType === "access_code" ? formData.accessCode : "",
        priceUsdc: formData.priceUsdc,
        sellerAddress: address as `0x${string}`,
        appId: selectedApp ? selectedApp.id : "",
        appName: selectedApp ? "" : formData.appInput.trim(),
        maxUses: maxUsesValue.toString(),
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
          listingType,
          inviteUrl:
            listingType === "invite_link" ? formData.inviteUrl : undefined,
          appUrl: listingType === "access_code" ? formData.appUrl : undefined,
          accessCode:
            listingType === "access_code" ? formData.accessCode : undefined,
          priceUsdc: parseFloat(formData.priceUsdc),
          sellerAddress: address,
          nonce: nonce.toString(),
          chainId,
          signature,
          maxUses: maxUsesValue,
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
        listingType: data.listing.listingType,
        priceUsdc: data.listing.priceUsdc,
        sellerAddress: data.listing.sellerAddress,
        status: data.listing.status,
        appId: data.listing.appId,
        appName: data.listing.appName,
        appUrl: data.listing.appUrl,
        appIconUrl: data.listing.appIconUrl,
        maxUses: data.listing.maxUses,
        purchaseCount: data.listing.purchaseCount,
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

  const resetForm = () => {
    setCreatedSlug("");
    setFormData({
      inviteUrl: "",
      appUrl: "",
      accessCode: "",
      priceUsdc: "",
      appInput: "",
      maxUses: "1",
    });
    setSelectedApp(null);
    setIsValueConfirmed(false);
    setListingType("invite_link");
    setIsUnlimitedUses(false);
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
              Your {listingType === "access_code" ? "access code" : "invite"} is
              now live on the marketplace
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/listing/${createdSlug}`)}
                className="hover-scale group relative w-full rounded-xl py-3.5 px-6 font-semibold overflow-hidden cursor-pointer active:scale-95"
              >
                {/* Dark background */}
                <div className="absolute inset-0 bg-zinc-900/90 border border-white/10 pointer-events-none" />
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
              </button>
              <button
                onClick={resetForm}
                className="hover-scale w-full rounded-xl py-4 px-6 font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer active:scale-95"
              >
                Create Another Listing
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-100">
      <div className="max-w-3xl mx-auto py-8 sm:py-12 md:py-16 px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-12 text-center"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4 bg-linear-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            List Your Invite
          </h1>
          <p className="text-base sm:text-lg text-zinc-400">
            Sell your exclusive invite link or access code and earn instantly
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-zinc-950 border border-zinc-800 shadow-premium p-5 sm:p-8 md:p-10"
        >
          {/* Listing Type Tabs */}
          <div className="mb-6 sm:mb-8">
            <div className="flex gap-1 p-1 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <button
                type="button"
                onClick={() => setListingType("invite_link")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                  listingType === "invite_link"
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
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Invite Link
              </button>
              <button
                type="button"
                onClick={() => setListingType("access_code")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                  listingType === "access_code"
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
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                Access Code
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
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
                              const appIconUrl =
                                "appIconUrl" in selected
                                  ? selected.appIconUrl
                                  : undefined;
                              setSelectedApp({
                                id: selected.id,
                                appName: selected.appName,
                                appIconUrl,
                              });
                            } else {
                              setSelectedApp(null);
                            }
                            setFormData((prev) => ({
                              ...prev,
                              appInput: selected.appName,
                            }));
                            setIsValueConfirmed(true);
                            setShowDropdown(false);
                            // Focus next input field based on listing type
                            setTimeout(() => {
                              if (listingType === "invite_link") {
                                inviteUrlInputRef.current?.focus();
                              } else {
                                appUrlInputRef.current?.focus();
                              }
                            }, 0);
                          }
                        } else if (e.key === "Escape") {
                          setShowDropdown(false);
                        }
                      }}
                      required
                      placeholder="Type app name or select from fe..."
                      className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-150 hover:border-zinc-600 text-sm sm:text-base"
                    />
                    {selectedApp && !showDropdown && (
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-400 font-medium">
                        Featured
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600">
                      <div className="w-5 h-5 rounded overflow-hidden border border-zinc-500 bg-white p-0.5 shrink-0 flex items-center justify-center relative">
                        {/* Fallback letter (always rendered, behind image) */}
                        <span className="text-[10px] font-bold text-zinc-800 absolute inset-0 flex items-center justify-center">
                          {formData.appInput.charAt(0).toUpperCase()}
                        </span>
                        {/* Image (on top, hides fallback when loaded) */}
                        {selectedApp?.appIconUrl && (
                          <Image
                            src={selectedApp.appIconUrl}
                            alt={selectedApp.appName}
                            width={16}
                            height={16}
                            className="rounded-sm object-contain w-full h-full relative z-10 bg-white"
                            unoptimized
                          />
                        )}
                      </div>
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
                      <div className="max-h-64 overflow-y-auto">
                        {dropdownItems.map((item, index) => {
                          const isHighlighted = index === highlightedIndex;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                if (item.section !== "custom") {
                                  setSelectedApp({
                                    id: item.id,
                                    appName: item.appName,
                                    appIconUrl: item.appIconUrl,
                                  });
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
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg overflow-hidden border border-zinc-600 bg-white p-0.5 shrink-0 flex items-center justify-center relative">
                                  {/* Fallback letter (always rendered, behind image) */}
                                  <span className="text-xs font-bold text-zinc-800 absolute inset-0 flex items-center justify-center">
                                    {item.appName.charAt(0).toUpperCase()}
                                  </span>
                                  {/* Image (on top, hides fallback when loaded) */}
                                  {item.appIconUrl && (
                                    <Image
                                      src={item.appIconUrl}
                                      alt={item.appName}
                                      width={24}
                                      height={24}
                                      className="rounded object-contain w-full h-full relative z-10 bg-white"
                                      unoptimized
                                    />
                                  )}
                                </div>
                                <span className="text-zinc-100 font-medium">
                                  {item.appName}
                                </span>
                              </div>
                              {item.section === "featured" ? (
                                <span
                                  className={`px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-400 font-medium transition-all ${
                                    isHighlighted
                                      ? "bg-cyan-500/30"
                                      : "group-hover:bg-cyan-500/30"
                                  }`}
                                >
                                  Featured
                                </span>
                              ) : item.section === "custom" ? (
                                <span className="text-xs text-zinc-500">
                                  Press Enter to select
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Conditional fields based on listing type */}
            <AnimatePresence mode="wait">
              {listingType === "invite_link" ? (
                <motion.div
                  key="invite_link"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
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
                    required={listingType === "invite_link"}
                    placeholder="https://app.example.com/invite/.."
                    className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-150 hover:border-zinc-600 text-sm sm:text-base"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    The unique invite link you want to sell
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="access_code"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* App URL */}
                  <div>
                    <label
                      htmlFor="appUrl"
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
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                      App URL
                    </label>
                    <input
                      type="url"
                      id="appUrl"
                      name="appUrl"
                      ref={appUrlInputRef}
                      value={formData.appUrl}
                      onChange={handleChange}
                      required={listingType === "access_code"}
                      placeholder="https://app.example.com"
                      className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-150 hover:border-zinc-600 text-sm sm:text-base"
                    />
                    <div className="mt-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-xs text-yellow-400 flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5 shrink-0"
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
                        This URL will be publicly visible to potential buyers
                      </p>
                    </div>
                  </div>

                  {/* Access Code */}
                  <div>
                    <label
                      htmlFor="accessCode"
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
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                      Access Code
                    </label>
                    <input
                      type="text"
                      id="accessCode"
                      name="accessCode"
                      value={formData.accessCode}
                      onChange={handleChange}
                      required={listingType === "access_code"}
                      placeholder="Enter the access code"
                      className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-150 hover:border-zinc-600 text-sm sm:text-base font-mono"
                    />
                    <p className="mt-2 text-xs text-zinc-500">
                      The secret code buyers will use to access the app (only
                      revealed after payment)
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                  className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-150 hover:border-zinc-600 text-sm sm:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">
                  USDC
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Set a competitive price for your{" "}
                {listingType === "access_code" ? "access code" : "invite"}
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

            {/* Number of Uses - Collapsible */}
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300 py-2">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>Number of Uses</span>
                <span className="text-cyan-400 font-normal">
                  {isUnlimitedUses ? "∞ Unlimited" : formData.maxUses || "1"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsUsesExpanded(!isUsesExpanded)}
                  className="p-1.5 rounded-lg border border-zinc-700 hover:border-cyan-500/50 hover:bg-zinc-800 cursor-pointer transition-all"
                >
                  <svg
                    className="w-3.5 h-3.5 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>

              <AnimatePresence>
                {isUsesExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-3">
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
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <input
                            type="number"
                            id="maxUses"
                            name="maxUses"
                            value={formData.maxUses}
                            onChange={handleChange}
                            onWheel={(e) => e.currentTarget.blur()}
                            min="1"
                            step="1"
                            placeholder="1"
                            className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-150 hover:border-zinc-600 text-sm sm:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </motion.div>
                      )}

                      <p className="text-xs text-cyan-400">
                        {isUnlimitedUses
                          ? "This invite can be used unlimited times"
                          : `This invite can be used ${formData.maxUses || 1} time${(parseInt(formData.maxUses, 10) || 1) === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isConnected && address && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-zinc-900/80 border border-cyan-500/30 p-4 sm:p-5"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 mt-0.5 shrink-0"
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
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-zinc-300 mb-1">
                      <span className="font-semibold">Payment recipient:</span>
                    </p>
                    <p className="font-mono text-cyan-400 text-xs sm:text-sm break-all">
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

            <button
              type={isConnected ? "submit" : "button"}
              disabled={isSubmitting}
              onClick={
                !isConnected
                  ? () =>
                      connect({ client: thirdwebClient, chain: thirdwebChain })
                  : undefined
              }
              className={`group relative w-full rounded-xl py-4 px-6 font-bold text-lg overflow-hidden disabled:cursor-not-allowed cursor-pointer transition-transform ${
                !isSubmitting ? "hover-scale active:scale-95" : ""
              }`}
            >
              {isConnected && !isSubmitting ? (
                <>
                  <div className="absolute inset-0 bg-linear-to-r from-cyan-500 to-blue-500" />
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
                  {/* Glow effect - hidden on mobile */}
                  <div className="hidden md:block absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-linear-to-r from-cyan-500 to-blue-500" />
                </>
              ) : isSubmitting ? (
                <>
                  <div className="absolute inset-0 bg-linear-to-r from-cyan-500 to-blue-500" />
                  <span className="relative z-10 text-black flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating Listing...
                  </span>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-linear-to-r from-cyan-500 to-blue-500" />
                  <span className="relative z-10 text-black flex items-center justify-center gap-2">
                    Connect Wallet
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
                  {/* Glow effect - hidden on mobile */}
                  <div className="hidden md:block absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-linear-to-r from-cyan-500 to-blue-500" />
                </>
              )}
            </button>
          </form>

          {/* Info section */}
          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3 sm:mb-4 flex items-center gap-2">
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
            <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-zinc-400">
              <li className="flex items-start gap-2.5 sm:gap-3">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-bold text-cyan-400">
                  1
                </span>
                <span>Sign the message to create your listing</span>
              </li>
              <li className="flex items-start gap-2.5 sm:gap-3">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-bold text-cyan-400">
                  2
                </span>
                <span>
                  Buyers discover your{" "}
                  {listingType === "access_code" ? "access code" : "invite"} on
                  the marketplace
                </span>
              </li>
              <li className="flex items-start gap-2.5 sm:gap-3">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-bold text-cyan-400">
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

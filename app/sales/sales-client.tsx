"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { featuredApps } from "@/data/featuredApps";
import { getGradientForApp } from "@/lib/listings";
import {
  useResolveAddresses,
  getSellerDisplayInfo,
} from "@/lib/resolve-addresses";
import { blo } from "blo";

interface Transaction {
  _id: string;
  txHash: string;
  listingSlug: string;
  sellerAddress: string;
  buyerAddress: string;
  priceUsdc: number;
  appId: string;
  appName?: string;
  appIconUrl?: string;
  iconNeedsDarkBg?: boolean;
  chainId: number;
  createdAt: string;
}

interface SalesData {
  transactions: Transaction[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

const SALES_QUERY_KEY = ["sales"];
const LIMIT = 20;
const AUTO_REFRESH_INTERVAL = 30;

type SortField = "app" | "time" | "price";
type SortDirection = "asc" | "desc";

function resolveAppName(transaction: Transaction): string {
  if (transaction.appId) {
    const featuredApp = featuredApps.find((app) => app.id === transaction.appId);
    if (featuredApp) {
      return featuredApp.appName;
    }
  }
  return transaction.appName || transaction.appId || "App";
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return (
      <svg
        className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-500 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-3.5 h-3.5 text-cyan-400 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {direction === "asc" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      )}
    </svg>
  );
}

function RefreshIndicator({
  countdown,
  isRefreshing,
  onRefresh,
}: {
  countdown: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Auto-refresh in {countdown}s</span>
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 transition-all cursor-pointer"
        title="Refresh now"
      >
        <svg
          className={`w-4 h-4 text-zinc-400 ${isRefreshing ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}

export default function SalesClient() {
  const [page, setPage] = useState(1);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);
  const [sortField, setSortField] = useState<SortField>("time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchSalesData = async (): Promise<SalesData> => {
    const skip = (page - 1) * LIMIT;
    const response = await fetch(`/api/sales/?limit=${LIMIT}&skip=${skip}`);
    if (!response.ok) throw new Error("Failed to fetch sales");
    return response.json();
  };

  const {
    data: salesData,
    isLoading: loading,
    error: queryError,
    isFetching: isRefreshing,
    dataUpdatedAt,
    refetch,
  } = useQuery<SalesData>({
    queryKey: [...SALES_QUERY_KEY, page],
    queryFn: fetchSalesData,
    staleTime: AUTO_REFRESH_INTERVAL * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const transactions = salesData?.transactions || [];
  const error = queryError ? "Failed to load sales" : null;

  const uniqueApps = useMemo(() => {
    const appsMap = new Map<string, { name: string; iconUrl?: string; iconNeedsDarkBg?: boolean; count: number }>();
    
    transactions.forEach((tx) => {
      const appName = resolveAppName(tx);
      const key = tx.appId || appName;
      
      if (appsMap.has(key)) {
        const existing = appsMap.get(key)!;
        appsMap.set(key, { ...existing, count: existing.count + 1 });
      } else {
        appsMap.set(key, {
          name: appName,
          iconUrl: tx.appIconUrl,
          iconNeedsDarkBg: tx.iconNeedsDarkBg,
          count: 1,
        });
      }
    });

    return Array.from(appsMap.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedApps.size === 0) return transactions;
    return transactions.filter((tx) => {
      const appName = resolveAppName(tx);
      const key = tx.appId || appName;
      return selectedApps.has(key);
    });
  }, [transactions, selectedApps]);

  const allAddresses = useMemo(() => {
    const addresses = new Set<string>();
    filteredTransactions.forEach((tx) => {
      addresses.add(tx.sellerAddress);
      addresses.add(tx.buyerAddress);
    });
    return [...addresses];
  }, [filteredTransactions]);

  const { resolvedAddresses } = useResolveAddresses(allAddresses);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const timeSinceUpdate = Math.floor((now - dataUpdatedAt) / 1000);
      const remaining = Math.max(0, AUTO_REFRESH_INTERVAL - timeSinceUpdate);
      setCountdown(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [dataUpdatedAt]);

  const handleManualRefresh = () => {
    refetch();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "price" ? "asc" : "desc");
    }
  };

  const toggleAppFilter = (appKey: string) => {
    setSelectedApps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(appKey)) {
        newSet.delete(appKey);
      } else {
        newSet.add(appKey);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSelectedApps(new Set());
  };

  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    const multiplier = sortDirection === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortField) {
        case "app":
          const appA = resolveAppName(a);
          const appB = resolveAppName(b);
          return appA.localeCompare(appB) * multiplier;
        case "time":
          return (
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
            multiplier
          );
        case "price":
          return (a.priceUsdc - b.priceUsdc) * multiplier;
        default:
          return 0;
      }
    });

    return sorted;
  }, [filteredTransactions, sortField, sortDirection]);

  const totalPages = Math.ceil((salesData?.pagination.total || 0) / LIMIT);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen text-zinc-100">
      {/* Hero Section */}
      <section className="relative pt-16 md:pt-20 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
              <Link href="/" className="hover:text-zinc-300 transition-colors">
                Home
              </Link>
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-zinc-300">All Sales</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="text-white">All </span>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Sales
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl">
              Recent invite purchases on the marketplace
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 pb-24 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Filters */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:w-64 shrink-0"
          >
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 mb-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left cursor-pointer"
            >
              <span className="font-medium text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filters
                {selectedApps.size > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">
                    {selectedApps.size}
                  </span>
                )}
              </span>
              <svg
                className={`w-5 h-5 text-zinc-400 transition-transform ${
                  showMobileFilters ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Filter Panel */}
            <div
              className={`${
                showMobileFilters ? "block" : "hidden"
              } lg:block rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden`}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-semibold text-white">Filter by App</h3>
                {selectedApps.size > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* App List */}
              <div className="p-3 max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 animate-pulse"
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                        <div className="flex-1">
                          <div className="h-4 w-24 bg-zinc-800 rounded" />
                        </div>
                        <div className="h-5 w-8 bg-zinc-800 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : uniqueApps.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    No apps with sales yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {uniqueApps.map((app) => {
                      const isSelected = selectedApps.has(app.key);
                      const gradient = getGradientForApp(app.name);

                      return (
                        <button
                          key={app.key}
                          onClick={() => toggleAppFilter(app.key)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? "bg-zinc-800 border border-zinc-700"
                              : "hover:bg-zinc-900 border border-transparent"
                          }`}
                        >
                          {/* App Icon */}
                          {app.iconUrl ? (
                            <div
                              className={`w-8 h-8 rounded-lg overflow-hidden border shrink-0 p-0.5 ${
                                app.iconNeedsDarkBg ? "bg-zinc-900" : "bg-white"
                              }`}
                              style={{
                                borderColor: isSelected
                                  ? gradient.from
                                  : "rgb(63 63 70)",
                              }}
                            >
                              <Image
                                src={app.iconUrl}
                                alt={app.name}
                                width={28}
                                height={28}
                                className="w-full h-full object-contain rounded-md"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div
                              className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-sm"
                              style={{
                                background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                              }}
                            >
                              {app.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* App Name */}
                          <span
                            className={`flex-1 text-left text-sm font-medium truncate ${
                              isSelected ? "text-white" : "text-zinc-400"
                            }`}
                          >
                            {app.name}
                          </span>

                          {/* Count Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isSelected
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {app.count}
                          </span>

                          {/* Checkbox */}
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-cyan-500 border-cyan-500"
                                : "border-zinc-600"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Content - Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            {/* Header */}
            <div className="space-y-3 mb-6">
              {/* Title Row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {selectedApps.size > 0 ? "Filtered Sales" : "All Sales"}
                  </h2>
                  {!loading && (
                    <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 text-sm font-medium">
                      {sortedTransactions.length}{" "}
                      {sortedTransactions.length === 1 ? "sale" : "sales"}
                    </span>
                  )}
                </div>

                <RefreshIndicator
                  countdown={countdown}
                  isRefreshing={isRefreshing}
                  onRefresh={handleManualRefresh}
                />
              </div>

              {/* Mobile Sort Row */}
              {sortedTransactions.length > 0 && (
                <div className="flex lg:hidden items-center gap-2">
                  <span className="text-xs text-zinc-500">Sort:</span>
                  <div className="flex gap-1 flex-wrap">
                    {(["app", "time", "price"] as SortField[]).map((field) => (
                      <button
                        key={field}
                        onClick={() => handleSort(field)}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                          sortField === field
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                        }`}
                      >
                        {field === "app"
                          ? "App"
                          : field === "time"
                          ? "Time"
                          : "Price"}
                        {sortField === field && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                {/* Desktop Loading Header */}
                <div className="hidden md:grid grid-cols-[minmax(120px,1.5fr)_minmax(100px,1fr)_minmax(120px,1.5fr)_minmax(120px,1.5fr)_minmax(100px,1fr)] gap-4 px-5 py-3 bg-zinc-900/50 border-b border-zinc-800">
                  <div className="h-3 w-12 bg-zinc-800 rounded" />
                  <div className="h-3 w-14 bg-zinc-800 rounded" />
                  <div className="h-3 w-16 bg-zinc-800 rounded" />
                  <div className="h-3 w-16 bg-zinc-800 rounded" />
                  <div className="h-3 w-12 bg-zinc-800 rounded" />
                </div>

                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="border-b border-zinc-800 last:border-b-0 animate-pulse"
                  >
                    {/* Desktop Loading Row */}
                    <div className="hidden md:grid grid-cols-[minmax(120px,1.5fr)_minmax(100px,1fr)_minmax(120px,1.5fr)_minmax(120px,1.5fr)_minmax(100px,1fr)] gap-4 px-5 py-4 items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 shrink-0" />
                        <div className="h-4 w-16 bg-zinc-800 rounded" />
                      </div>
                      <div className="h-4 w-16 bg-zinc-800 rounded" />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
                        <div className="h-4 w-20 bg-zinc-800 rounded" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
                        <div className="h-4 w-20 bg-zinc-800 rounded" />
                      </div>
                      <div className="h-5 w-14 bg-zinc-800 rounded" />
                    </div>

                    {/* Mobile Loading Card */}
                    <div className="md:hidden p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-24 bg-zinc-800 rounded" />
                          <div className="h-3 w-20 bg-zinc-800 rounded" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-16 bg-zinc-800 rounded" />
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-800" />
                          <div className="h-3 w-24 bg-zinc-800 rounded" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-16 bg-zinc-800 rounded" />
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-800" />
                          <div className="h-3 w-24 bg-zinc-800 rounded" />
                        </div>
                      </div>
                      <div className="h-6 w-20 bg-zinc-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl bg-zinc-950 border border-red-500/30 p-8 text-center"
              >
                <p className="text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Empty State */}
            {!loading && !error && sortedTransactions.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl bg-zinc-950 border border-zinc-800 p-12 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-zinc-500"
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
                <h3 className="text-lg font-semibold text-white mb-2">
                  {selectedApps.size > 0
                    ? "No sales match your filters"
                    : "No sales yet"}
                </h3>
                <p className="text-zinc-400 text-sm mb-6">
                  {selectedApps.size > 0
                    ? "Try adjusting your filters or check back later."
                    : "Be the first to make a purchase!"}
                </p>
                {selectedApps.size > 0 && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </motion.div>
            )}

            {/* Sales Table */}
            {!loading && !error && sortedTransactions.length > 0 && (
              <>
                <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                  {/* Table Header - Desktop Only */}
                  <div className="hidden md:grid grid-cols-[minmax(120px,1.5fr)_minmax(100px,1fr)_minmax(120px,1.5fr)_minmax(120px,1.5fr)_minmax(100px,1fr)] gap-4 px-5 py-3 bg-zinc-900/50 border-b border-zinc-800 text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("app")}
                      className="flex items-center gap-1 text-left cursor-pointer hover:text-zinc-300 transition-colors group"
                    >
                      <span
                        className={
                          sortField === "app" ? "text-cyan-400" : "text-zinc-500"
                        }
                      >
                        App
                      </span>
                      <SortIcon
                        active={sortField === "app"}
                        direction={sortDirection}
                      />
                    </button>
                    <button
                      onClick={() => handleSort("time")}
                      className="flex items-center gap-1 text-left cursor-pointer hover:text-zinc-300 transition-colors group"
                    >
                      <span
                        className={
                          sortField === "time" ? "text-cyan-400" : "text-zinc-500"
                        }
                      >
                        Time
                      </span>
                      <SortIcon
                        active={sortField === "time"}
                        direction={sortDirection}
                      />
                    </button>
                    <div className="text-zinc-500">Buyer</div>
                    <div className="text-zinc-500">Seller</div>
                    <button
                      onClick={() => handleSort("price")}
                      className="flex items-center gap-1 cursor-pointer hover:text-zinc-300 transition-colors group"
                    >
                      <span
                        className={
                          sortField === "price" ? "text-cyan-400" : "text-zinc-500"
                        }
                      >
                        Price
                      </span>
                      <SortIcon
                        active={sortField === "price"}
                        direction={sortDirection}
                      />
                    </button>
                  </div>

                  {/* Table Rows */}
                  {sortedTransactions.map((tx) => {
                    const appName = resolveAppName(tx);
                    const gradient = getGradientForApp(appName);
                    const sellerInfo = getSellerDisplayInfo(
                      tx.sellerAddress,
                      resolvedAddresses
                    );
                    const buyerInfo = getSellerDisplayInfo(
                      tx.buyerAddress,
                      resolvedAddresses
                    );

                    return (
                      <div
                        key={tx._id}
                        className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/30 transition-colors"
                      >
                        {/* Desktop Row */}
                        <div className="hidden md:grid grid-cols-[minmax(120px,1.5fr)_minmax(100px,1fr)_minmax(120px,1.5fr)_minmax(120px,1.5fr)_minmax(100px,1fr)] gap-4 px-5 py-4 items-center">
                          {/* App */}
                          <div className="flex items-center gap-2 min-w-0">
                            {tx.appIconUrl ? (
                              <div
                                className={`w-8 h-8 rounded-lg overflow-hidden border shrink-0 p-0.5 ${
                                  tx.iconNeedsDarkBg ? "bg-zinc-900" : "bg-white"
                                }`}
                                style={{ borderColor: gradient.from }}
                              >
                                <Image
                                  src={tx.appIconUrl}
                                  alt={appName}
                                  width={28}
                                  height={28}
                                  className="w-full h-full object-contain rounded-md"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div
                                className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                                }}
                              >
                                {appName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <Link
                              href={`/listing/${tx.listingSlug}`}
                              className="font-medium text-sm text-white hover:text-cyan-400 transition-colors truncate"
                            >
                              {appName}
                            </Link>
                          </div>

                          {/* Time */}
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-zinc-300">
                              {formatDate(tx.createdAt)}
                            </p>
                          </div>

                          {/* Buyer */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                              <img
                                src={
                                  buyerInfo.avatarUrl ||
                                  blo(tx.buyerAddress as `0x${string}`)
                                }
                                alt="Buyer"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              {buyerInfo.resolvedType ? (
                                <Link
                                  href={`/profile/${tx.buyerAddress}`}
                                  className="font-medium text-sm text-white flex items-center gap-1 hover:text-cyan-400 transition-colors truncate"
                                >
                                  {buyerInfo.resolvedType === "farcaster" && "@"}
                                  {buyerInfo.displayName}
                                  {buyerInfo.resolvedType === "farcaster" && (
                                    <Image
                                      src="/farcaster-logo.svg"
                                      alt="Farcaster"
                                      width={12}
                                      height={12}
                                      className="inline-block opacity-60"
                                    />
                                  )}
                                </Link>
                              ) : (
                                <Link
                                  href={`/profile/${tx.buyerAddress}`}
                                  className="font-mono text-sm text-zinc-300 hover:text-cyan-400 transition-colors truncate"
                                >
                                  {buyerInfo.shortAddress}
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Seller */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                              <img
                                src={
                                  sellerInfo.avatarUrl ||
                                  blo(tx.sellerAddress as `0x${string}`)
                                }
                                alt="Seller"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              {sellerInfo.resolvedType ? (
                                <Link
                                  href={`/profile/${tx.sellerAddress}`}
                                  className="font-medium text-sm text-white flex items-center gap-1 hover:text-cyan-400 transition-colors truncate"
                                >
                                  {sellerInfo.resolvedType === "farcaster" && "@"}
                                  {sellerInfo.displayName}
                                  {sellerInfo.resolvedType === "farcaster" && (
                                    <Image
                                      src="/farcaster-logo.svg"
                                      alt="Farcaster"
                                      width={12}
                                      height={12}
                                      className="inline-block opacity-60"
                                    />
                                  )}
                                </Link>
                              ) : (
                                <Link
                                  href={`/profile/${tx.sellerAddress}`}
                                  className="font-mono text-sm text-zinc-300 hover:text-cyan-400 transition-colors truncate"
                                >
                                  {sellerInfo.shortAddress}
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="flex items-center">
                            <p className="text-sm font-bold text-cyan-400">
                              ${tx.priceUsdc.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Mobile Card */}
                        <div className="md:hidden p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            {tx.appIconUrl ? (
                              <div
                                className={`w-10 h-10 rounded-lg overflow-hidden border shrink-0 p-0.5 ${
                                  tx.iconNeedsDarkBg ? "bg-zinc-900" : "bg-white"
                                }`}
                                style={{ borderColor: gradient.from }}
                              >
                                <Image
                                  src={tx.appIconUrl}
                                  alt={appName}
                                  width={36}
                                  height={36}
                                  className="w-full h-full object-contain rounded-md"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div
                                className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-base"
                                style={{
                                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                                }}
                              >
                                {appName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/listing/${tx.listingSlug}`}
                                className="font-semibold text-white hover:text-cyan-400 transition-colors block truncate"
                              >
                                {appName}
                              </Link>
                              <p className="text-sm text-zinc-400 mt-1">
                                {formatDate(tx.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Buyer</p>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                                <img
                                  src={
                                    buyerInfo.avatarUrl ||
                                    blo(tx.buyerAddress as `0x${string}`)
                                  }
                                  alt="Buyer"
                                  width={24}
                                  height={24}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Link
                                href={`/profile/${tx.buyerAddress}`}
                                className="text-sm text-zinc-300 hover:text-cyan-400 transition-colors truncate"
                              >
                                {buyerInfo.resolvedType
                                  ? `${buyerInfo.resolvedType === "farcaster" ? "@" : ""}${buyerInfo.displayName}`
                                  : buyerInfo.shortAddress}
                              </Link>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Seller</p>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                                <img
                                  src={
                                    sellerInfo.avatarUrl ||
                                    blo(tx.sellerAddress as `0x${string}`)
                                  }
                                  alt="Seller"
                                  width={24}
                                  height={24}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Link
                                href={`/profile/${tx.sellerAddress}`}
                                className="text-sm text-zinc-300 hover:text-cyan-400 transition-colors truncate"
                              >
                                {sellerInfo.resolvedType
                                  ? `${sellerInfo.resolvedType === "farcaster" ? "@" : ""}${sellerInfo.displayName}`
                                  : sellerInfo.shortAddress}
                              </Link>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Price</p>
                            <p className="text-lg font-bold text-cyan-400">
                              ${tx.priceUsdc.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg font-medium bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                              page === pageNum
                                ? "bg-cyan-500 text-black border border-cyan-400"
                                : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-lg font-medium bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
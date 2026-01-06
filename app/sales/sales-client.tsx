"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
    RefreshIndicator,
    AUTO_REFRESH_INTERVAL,
  } from "@/app/components/RefreshIndicator";
import { getGradientForApp } from "@/lib/listings";
import { featuredApps } from "@/data/featuredApps";
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

type SortField = "app" | "time" | "price";
type SortDirection = "asc" | "desc";

/* ---------- Helper to resolve app name ---------- */
function resolveAppName(transaction: Transaction): string {
  if (transaction.appId) {
    const featuredApp = featuredApps.find((app) => app.id === transaction.appId);
    if (featuredApp) {
      return featuredApp.appName;
    }
  }
  return transaction.appName || transaction.appId || "App";
}

/* ---------- Sort Icon Component ---------- */
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

export default function SalesClient() {
  const [page, setPage] = useState(1);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);
  const [sortField, setSortField] = useState<SortField>("time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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
  const totalPages = salesData
    ? Math.ceil(salesData.pagination.total / LIMIT)
    : 1;
  const error = queryError ? "Failed to load sales" : null;

  // Get unique addresses for resolution (both buyers and sellers)
  const allAddresses = useMemo(() => {
    const addresses = new Set<string>();
    transactions.forEach((tx) => {
      addresses.add(tx.sellerAddress);
      addresses.add(tx.buyerAddress);
    });
    return [...addresses];
  }, [transactions]);

  const { resolvedAddresses } = useResolveAddresses(allAddresses);

  // Countdown timer effect
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

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "price" ? "asc" : "desc");
    }
  };

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions];
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
  }, [transactions, sortField, sortDirection]);

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
    <div className="min-h-screen bg-black">
      {/* Background effects - static on mobile */}
      <div className="fixed inset-0 -z-10">
        <div className="bg-mobile-gradient absolute inset-0" />
        <div className="bg-orbs-container">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-24 md:py-32">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              All Sales
            </h1>
            <RefreshIndicator
              countdown={countdown}
              isRefreshing={isRefreshing}
              onRefresh={handleManualRefresh}
            />
          </div>
          <p className="text-lg text-zinc-400">
            Recent invite purchases on the marketplace
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Sales list */}
        {!loading && !error && sortedTransactions.length === 0 && (
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-12 text-center">
            <p className="text-zinc-400">No sales yet</p>
          </div>
        )}

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
                            className="w-8 h-8 rounded-lg overflow-hidden border shrink-0 bg-white p-0.5"
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              buyerInfo.avatarUrl ||
                              blo(tx.buyerAddress as `0x${string}`)
                            }
                            alt="Buyer avatar"
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              sellerInfo.avatarUrl ||
                              blo(tx.sellerAddress as `0x${string}`)
                            }
                            alt="Seller avatar"
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
                        <p className="text-sm font-bold text-white">
                          ${tx.priceUsdc.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="md:hidden p-4 space-y-3">
                      {/* App & Time Row */}
                      <div className="flex items-start gap-3">
                        {tx.appIconUrl ? (
                          <div
                            className="w-10 h-10 rounded-lg overflow-hidden border shrink-0 bg-white p-0.5"
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

                      {/* Buyer */}
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Buyer</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                buyerInfo.avatarUrl ||
                                blo(tx.buyerAddress as `0x${string}`)
                              }
                              alt="Buyer avatar"
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
                              ? `${
                                  buyerInfo.resolvedType === "farcaster"
                                    ? "@"
                                    : ""
                                }${buyerInfo.displayName}`
                              : buyerInfo.shortAddress}
                          </Link>
                        </div>
                      </div>

                      {/* Seller */}
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Seller</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                sellerInfo.avatarUrl ||
                                blo(tx.sellerAddress as `0x${string}`)
                              }
                              alt="Seller avatar"
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
                              ? `${
                                  sellerInfo.resolvedType === "farcaster"
                                    ? "@"
                                    : ""
                                }${sellerInfo.displayName}`
                              : sellerInfo.shortAddress}
                          </Link>
                        </div>
                      </div>

                      {/* Price */}
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Price</p>
                        <p className="text-lg font-bold text-white">
                          ${tx.priceUsdc.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {/* Previous button */}
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

                {/* Page numbers */}
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

                {/* Next button */}
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
      </div>
    </div>
  );
}
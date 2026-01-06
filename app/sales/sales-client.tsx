"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    RefreshIndicator,
    AUTO_REFRESH_INTERVAL,
  } from "@/app/components/RefreshIndicator";

interface Transaction {
  _id: string;
  txHash: string;
  listingSlug: string;
  sellerAddress: string;
  buyerAddress: string;
  priceUsdc: number;
  appId: string;
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

export default function SalesClient() {
  const [page, setPage] = useState(1);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);

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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
        {!loading && !error && transactions.length === 0 && (
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-12 text-center">
            <p className="text-zinc-400">No sales yet</p>
          </div>
        )}

        {!loading && !error && transactions.length > 0 && (
          <>
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx._id}
                  className="rounded-xl bg-zinc-950 border border-zinc-800 p-6 hover:border-zinc-700 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                    {/* Time */}
                    <div className="md:col-span-2">
                      <p className="text-xs text-zinc-500 mb-1">Time</p>
                      <p className="text-sm font-medium text-zinc-300">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>

                    {/* Listing */}
                    <div className="md:col-span-3">
                      <p className="text-xs text-zinc-500 mb-1">Listing</p>
                      <Link
                        href={`/listing/${tx.listingSlug}`}
                        className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        {tx.listingSlug}
                      </Link>
                    </div>

                    {/* Buyer */}
                    <div className="md:col-span-2">
                      <p className="text-xs text-zinc-500 mb-1">Buyer</p>
                      <p className="text-sm font-mono text-zinc-300">
                        {formatAddress(tx.buyerAddress)}
                      </p>
                    </div>

                    {/* Seller */}
                    <div className="md:col-span-2">
                      <p className="text-xs text-zinc-500 mb-1">Seller</p>
                      <p className="text-sm font-mono text-zinc-300">
                        {formatAddress(tx.sellerAddress)}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="md:col-span-2">
                      <p className="text-xs text-zinc-500 mb-1">Price</p>
                      <p className="text-sm font-bold text-white">
                        ${tx.priceUsdc.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
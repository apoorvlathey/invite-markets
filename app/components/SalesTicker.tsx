"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { featuredApps } from "@/data/featuredApps";
import { getGradientForApp } from "@/lib/listings";

interface Transaction {
  _id: string;
  listingSlug: string;
  sellerAddress: string;
  buyerAddress: string;
  priceUsdc: number;
  appId: string;
  appName?: string;
  appIconUrl?: string;
  iconNeedsDarkBg?: boolean;
  createdAt: string;
}

interface SalesData {
  success: boolean;
  transactions: Transaction[];
}

function resolveAppName(transaction: Transaction): string {
  if (transaction.appId) {
    const featuredApp = featuredApps.find(
      (app) => app.id === transaction.appId
    );
    if (featuredApp) {
      return featuredApp.appName;
    }
  }
  return transaction.appName || transaction.appId || "App";
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function SaleItem({ transaction }: { transaction: Transaction }) {
  const appName = resolveAppName(transaction);
  const gradient = getGradientForApp(appName);

  return (
    <Link
      href={`/listing/${transaction.listingSlug}`}
      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group shrink-0"
    >
      {/* App Icon */}
      {transaction.appIconUrl ? (
        <div
          className={`w-5 h-5 rounded overflow-hidden shrink-0 ${
            transaction.iconNeedsDarkBg ? "bg-zinc-900" : "bg-white"
          }`}
        >
          <Image
            src={transaction.appIconUrl}
            alt={appName}
            width={20}
            height={20}
            className="w-full h-full object-contain"
            unoptimized
          />
        </div>
      ) : (
        <div
          className="w-5 h-5 rounded shrink-0 flex items-center justify-center font-bold text-white text-[10px]"
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
          }}
        >
          {appName.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Content */}
      <span className="text-xs text-zinc-400 whitespace-nowrap">
        <span className="text-zinc-300 font-medium group-hover:text-cyan-400 transition-colors">
          {appName}
        </span>
        {" sold for "}
        <span className="text-cyan-400 font-semibold">
          ${transaction.priceUsdc.toFixed(2)}
        </span>
        <span className="text-zinc-500 ml-1.5">
          {formatTimeAgo(transaction.createdAt)}
        </span>
      </span>
    </Link>
  );
}

// Shared constants with sales page for cache alignment
const SALES_QUERY_KEY = ["sales"];
const LIMIT = 20;
const AUTO_REFRESH_INTERVAL = 30; // seconds

export function SalesTicker() {
  const [isPaused, setIsPaused] = useState(false);

  // Use same query key as sales page (page 1) to share cache
  const { data: salesData, isLoading } = useQuery<SalesData>({
    queryKey: [...SALES_QUERY_KEY, 1],
    queryFn: async () => {
      const response = await fetch(`/api/sales?limit=${LIMIT}&skip=0`);
      if (!response.ok) throw new Error("Failed to fetch sales");
      return response.json();
    },
    staleTime: AUTO_REFRESH_INTERVAL * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: AUTO_REFRESH_INTERVAL * 1000, // Auto-refresh every 30s
  });

  const transactions = salesData?.transactions || [];

  // Don't show ticker if no transactions or still loading
  if (isLoading || transactions.length === 0) {
    return null;
  }

  // Duplicate transactions for seamless infinite scroll
  const duplicatedTransactions = [...transactions, ...transactions];

  return (
    <div className="w-full bg-black border-b border-zinc-800/50 sticky top-16 md:top-20 z-40">
      <div className="flex items-center">
        {/* Static "Latest Sales" label */}
        <Link
          href="/sales"
          className="flex items-center gap-1.5 px-3 md:px-4 py-2 shrink-0 border-r border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-fast" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors">
            <span className="hidden md:inline">Latest Sales</span>
            <span className="md:hidden">Live</span>
          </span>
        </Link>

        {/* Scrolling ticker area */}
        <div className="flex-1 overflow-hidden">
          <div
            className="flex items-center py-2 gap-4 pl-4 ticker-scroll"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            {duplicatedTransactions.map((tx, index) => (
              <SaleItem key={`${tx._id}-${index}`} transaction={tx} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

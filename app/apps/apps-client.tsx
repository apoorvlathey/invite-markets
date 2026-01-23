"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { getGradientForApp } from "@/lib/listings";
import { useTheme } from "@/app/contexts/ThemeContext";

interface AppData {
  id: string;
  name: string;
  iconUrl: string;
  iconNeedsDarkBg?: boolean;
  description: string;
  siteUrl?: string;
  totalListings: number;
  activeListings: number;
  lowestPrice: number | null;
  isFeatured: boolean;
}

interface AppsResponse {
  success: boolean;
  apps: AppData[];
  totalApps: number;
  featuredCount: number;
}

async function fetchApps(): Promise<AppsResponse> {
  const response = await fetch("/api/apps");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch apps");
  }

  return data;
}

export default function AppsClient() {
  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["apps"],
    queryFn: fetchApps,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const error = queryError instanceof Error ? queryError.message : "";
  const apps = data?.apps ?? [];

  return (
    <main className="min-h-screen text-zinc-100">
      {/* Hero Section */}
      <section className="relative pt-16 md:pt-20 pb-12 px-4">
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
              <span className="text-zinc-300">All Apps</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="text-white">Browse </span>
              <span className="bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                All Apps
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl">
              Discover invite codes to the hottest web3 apps.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <section className="px-4 pb-24 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden animate-pulse"
              >
                <div className="h-32 bg-zinc-900" />
                <div className="p-5 space-y-3">
                  <div className="h-6 w-3/4 bg-zinc-800 rounded" />
                  <div className="h-4 w-full bg-zinc-800 rounded" />
                  <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-6 w-20 bg-zinc-800 rounded-full" />
                    <div className="h-6 w-16 bg-zinc-800 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Error State */}
      {error && (
        <section className="px-4 pb-24 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-zinc-950 border border-red-500/30 p-8 text-center"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        </section>
      )}

      {/* Apps Grid */}
      {!isLoading && !error && apps.length > 0 && (
        <section className="px-4 pb-24 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {apps.map((app, i) => (
              <AppCard key={app.id} app={app} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!isLoading && !error && apps.length === 0 && (
        <section className="px-4 pb-24 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-zinc-950 border border-zinc-800 p-16 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <p className="text-zinc-400 text-lg mb-2">No apps yet</p>
            <p className="text-zinc-500 text-sm mb-6">
              Be the first to list an invite code!
            </p>
            <Link href="/sell">
              <button className="px-6 py-2.5 rounded-lg font-semibold text-black bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all cursor-pointer">
                Create Listing
              </button>
            </Link>
          </motion.div>
        </section>
      )}
    </main>
  );
}

function AppCard({ app, index }: { app: AppData; index: number }) {
  const gradient = getGradientForApp(app.name);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link href={`/app/${app.id}`}>
        <div className="group relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 cursor-pointer hover:-translate-y-1 featured-app-card">
          {/* Gradient accent bar */}
          <div
            className="h-1"
            style={{
              background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
            }}
          />

          {/* Tiled background header */}
          <div className="relative h-28 overflow-hidden card-header">
            {/* Tiled pattern */}
            <div
              className="absolute inset-0 grid grid-cols-6 gap-2 p-2"
              style={{
                transform: "rotate(-12deg) scale(1.4)",
                opacity: isLight ? 0.15 : 0.12,
              }}
            >
              {[...Array(18)].map((_, j) => (
                <div
                  key={j}
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <div 
                    className="w-full h-full rounded-md p-0.5 flex items-center justify-center overflow-hidden"
                    style={{ background: isLight ? '#d4d4d8' : (app.iconNeedsDarkBg ? '#18181b' : '#ffffff') }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={app.iconUrl}
                      alt=""
                      className="object-contain w-full h-full"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: isLight 
                  ? `linear-gradient(135deg, ${gradient.from}50 0%, ${gradient.to}60 100%)`
                  : `linear-gradient(135deg, ${gradient.from}15 0%, ${gradient.to}20 100%)`,
              }}
            />

            {/* Vignette - theme aware */}
            <div 
              className="absolute inset-0" 
              style={{ 
                background: isLight 
                  ? 'linear-gradient(to top, rgba(255,255,255,0.85), transparent 60%, rgba(255,255,255,0.3))'
                  : 'linear-gradient(to top, #09090b, transparent, rgba(9, 9, 11, 0.5))' 
              }} 
            />
            <div 
              className="absolute inset-0" 
              style={{ 
                background: isLight
                  ? 'linear-gradient(to right, rgba(255,255,255,0.5), transparent, rgba(255,255,255,0.5))'
                  : 'linear-gradient(to right, rgba(9, 9, 11, 0.6), transparent, rgba(9, 9, 11, 0.6))' 
              }} 
            />

            {/* Featured badge */}
            {app.isFeatured && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-cyan-500/30">
                <svg
                  className="w-3 h-3 text-cyan-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-[10px] font-medium text-cyan-400">
                  Featured
                </span>
              </div>
            )}
          </div>

          {/* Card content */}
          <div className="p-5">
            <div className="flex items-start gap-3 mb-3">
              {/* App icon */}
              <div className={`w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 p-1 shrink-0 shadow-lg ${
                app.iconNeedsDarkBg ? "bg-zinc-900" : "bg-white"
              }`}>
                <Image
                  src={app.iconUrl}
                  alt={`${app.name} icon`}
                  width={40}
                  height={40}
                  className="object-contain rounded-lg w-full h-full"
                  unoptimized={!app.isFeatured}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                  {app.name}
                </h3>
                {app.siteUrl && (
                  <p className="text-xs text-zinc-500 truncate">
                    {new URL(app.siteUrl).hostname}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-zinc-400 line-clamp-2 mb-4 min-h-[2.5rem]">
              {app.description}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-2">
              {app.activeListings > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {app.activeListings} active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-400">
                  Sold out
                </span>
              )}

              {app.lowestPrice !== null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-medium text-cyan-400">
                  From ${app.lowestPrice}
                </span>
              )}

              {app.totalListings - app.activeListings > 0 && (
                <span className="text-xs text-zinc-500">
                  {app.totalListings - app.activeListings} invites sold
                </span>
              )}
            </div>
          </div>

          {/* Hover arrow */}
          <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-5 h-5 text-cyan-400"
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
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

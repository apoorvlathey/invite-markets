"use client";

import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "@/app/components/ConnectButton";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10">
      {/* Navbar background */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="group flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg transition-all flex items-center justify-center">
              <Image
                src="/icon.png"
                alt="Invite.markets"
                width={16}
                height={16}
                className="w-6 h-6 object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:from-cyan-400 group-hover:to-blue-400 transition-all">
              invite.markets
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/#latest-listings"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors duration-150 rounded-lg hover:bg-white/5"
            >
              Explore
            </Link>
            <Link
              href="/listings"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors duration-150 rounded-lg hover:bg-white/5"
            >
              All Listings
            </Link>
            <Link
              href="/apps"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors duration-150 rounded-lg hover:bg-white/5"
            >
              All Apps
            </Link>
            <Link
              href="/sell"
              className="group relative px-6 py-3 text-sm font-bold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
            >
              {/* Animated gradient background */}
              <div
                className="absolute inset-0 bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600 animate-gradient"
                style={{ backgroundSize: "200% 200%" }}
              />

              {/* Shimmer effect */}
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Border glow */}
              <div className="absolute inset-0 rounded-xl border border-white/20" />

              {/* Content */}
              <span className="relative z-10 text-white flex items-center gap-2 drop-shadow-lg">
                <svg
                  className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Sell Invite
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>

              {/* Outer glow */}
              <div
                className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600"
                style={{ zIndex: -1 }}
              />
            </Link>
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

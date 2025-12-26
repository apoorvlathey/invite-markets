"use client";

import Image from "next/image";
import Link from "next/link";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, darkTheme } from "thirdweb/react";
import { base, baseSepolia } from "thirdweb/chains";

const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

// Custom theme matching the website's styling (STYLING.md)
const customTheme = darkTheme({
  colors: {
    // Modal and dropdown backgrounds
    modalBg: "#09090b", // zinc-950
    dropdownBg: "#18181b", // zinc-800
    separatorLine: "#27272a", // zinc-800

    // Borders
    borderColor: "#3f3f46", // zinc-700

    // Primary button (gradient style)
    primaryButtonBg: "#06b6d4", // cyan-500
    primaryButtonText: "#000000",

    // Secondary button
    secondaryButtonBg: "#27272a", // zinc-800
    secondaryButtonText: "#fafafa", // zinc-50
    secondaryButtonHoverBg: "#3f3f46", // zinc-700

    // Connected button background
    connectedButtonBg: "#27272a", // zinc-800
    connectedButtonBgHover: "#3f3f46", // zinc-700

    // Text colors
    primaryText: "#fafafa", // zinc-50
    secondaryText: "#a1a1aa", // zinc-400

    // Accent color
    accentText: "#06b6d4", // cyan-500
    accentButtonBg: "#06b6d4", // cyan-500
    accentButtonText: "#000000",

    // Skeleton loading
    skeletonBg: "#27272a", // zinc-800

    // Icons
    secondaryIconColor: "#71717a", // zinc-500
    secondaryIconHoverBg: "#3f3f46", // zinc-700
    secondaryIconHoverColor: "#fafafa", // zinc-50

    // Danger
    danger: "#ef4444", // red-500

    // Success
    success: "#10b981", // emerald-500

    // Input
    inputAutofillBg: "#18181b", // zinc-800

    // Selected text
    selectedTextBg: "#164e63", // cyan-900
    selectedTextColor: "#fafafa", // zinc-50

    // Tooltip
    tooltipBg: "#18181b", // zinc-800
    tooltipText: "#fafafa", // zinc-50

    // Scrollbar
    scrollbarBg: "#27272a", // zinc-800

    // Wallet selector
    walletSelectorButtonHoverBg: "#27272a", // zinc-800

    // Terms
    termsIconBg: "#27272a", // zinc-800
  },
});

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
            <ConnectButton
              client={thirdwebClient}
              chains={[base, baseSepolia]}
              theme={customTheme}
              connectButton={{
                label: "Connect",
                style: {
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: "600",
                  borderRadius: "12px",
                  border: "1px solid #3f3f46", // zinc-700
                  background: "#27272a", // zinc-800
                  color: "#fafafa", // white
                  cursor: "pointer",
                  transition: "all 150ms ease",
                },
              }}
              detailsButton={{
                style: {
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  borderRadius: "12px",
                  border: "1px solid #3f3f46", // zinc-700
                  background: "#27272a", // zinc-800
                  cursor: "pointer",
                  transition: "all 150ms ease",
                },
              }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

"use client";

import { useState, useRef, useEffect, useId } from "react";
import { createThirdwebClient } from "thirdweb";
import {
  ConnectButton as ThirdwebConnectButton,
  darkTheme,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useDisconnect,
} from "thirdweb/react";
import { base, baseSepolia } from "thirdweb/chains";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { blo } from "blo";
import {
  useResolveAddresses,
  getSellerDisplayInfo,
} from "@/lib/resolve-addresses";
import { getExplorerAddressUrl } from "@/lib/chain";

const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === "true";
const chain = isTestnet ? baseSepolia : base;

const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

// Custom theme matching the website's styling (STYLING.md)
const customTheme = darkTheme({
  colors: {
    modalBg: "#09090b",
    separatorLine: "#27272a",
    borderColor: "#3f3f46",
    primaryButtonBg: "#06b6d4",
    primaryButtonText: "#000000",
    secondaryButtonBg: "#27272a",
    secondaryButtonText: "#fafafa",
    secondaryButtonHoverBg: "#3f3f46",
    connectedButtonBg: "#27272a",
    connectedButtonBgHover: "#3f3f46",
    primaryText: "#fafafa",
    secondaryText: "#a1a1aa",
    accentText: "#06b6d4",
    accentButtonBg: "#06b6d4",
    accentButtonText: "#000000",
    skeletonBg: "#27272a",
    danger: "#ef4444",
    success: "#10b981",
  },
});

// Avatar component using blo or resolved avatar
function AccountAvatar({
  address,
  avatarUrl,
  size = 24,
}: {
  address: string;
  avatarUrl: string | null;
  size?: number;
}) {
  const bloAvatar = blo(address as `0x${string}`);

  return (
    <Image
      src={avatarUrl || bloAvatar}
      alt="Avatar"
      width={size}
      height={size}
      className="rounded-full"
    />
  );
}

// Menu item component
function MenuItem({
  icon,
  label,
  onClick,
  href,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "danger";
}) {
  const className = `flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg transition-all cursor-pointer ${
    variant === "danger"
      ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
      : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
  }`;

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Dropdown menu component
function AccountMenu({
  isOpen,
  onClose,
  address,
  triggerRef,
  chainName,
  onDisconnect,
  onAction,
}: {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  chainName: string;
  onDisconnect: () => void;
  onAction?: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { resolvedAddresses } = useResolveAddresses([address]);
  const displayInfo = getSellerDisplayInfo(address, resolvedAddresses);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleDisconnect = () => {
    onDisconnect();
    onClose();
    onAction?.();
  };

  const handleProfileClick = () => {
    onClose();
    onAction?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-xl bg-zinc-950 border border-zinc-800 shadow-xl overflow-hidden"
        >
          {/* Header with avatar and name */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <AccountAvatar
                address={address}
                avatarUrl={displayInfo.avatarUrl}
                size={32}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-white truncate">
                  {displayInfo.displayName}
                </span>
                {displayInfo.displayName !== displayInfo.shortAddress && (
                  <span className="text-xs text-zinc-500 truncate">
                    {displayInfo.shortAddress}
                  </span>
                )}
              </div>
            </div>
            {/* Chain info */}
            <div className="flex items-center gap-2 mt-3 px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <Image
                src="/images/base.svg"
                alt="Chain"
                width={16}
                height={16}
                className="rounded-full"
              />
              <span className="text-xs text-zinc-400">{chainName}</span>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            <MenuItem
              icon={
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              }
              label="Profile"
              href={`/profile/${address}`}
              onClick={handleProfileClick}
            />
            <MenuItem
              icon={
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              }
              label="Disconnect"
              onClick={handleDisconnect}
              variant="danger"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Main ConnectButton component
export function ConnectButton({
  compact = false,
  onAction,
}: {
  compact?: boolean;
  onAction?: () => void;
}) {
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const { disconnect } = useDisconnect();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Resolve address for display
  const { resolvedAddresses } = useResolveAddresses(
    activeAccount?.address ? [activeAccount.address] : []
  );

  const handleDisconnect = () => {
    if (activeWallet) {
      disconnect(activeWallet);
    }
  };

  const displayInfo = activeAccount?.address
    ? getSellerDisplayInfo(activeAccount.address, resolvedAddresses)
    : null;

  // If not connected, show the thirdweb connect button
  if (!activeAccount) {
    return (
      <ThirdwebConnectButton
        client={thirdwebClient}
        chains={[chain]}
        theme={customTheme}
        connectButton={{
          label: "Connect",
          style: compact
            ? {
                padding: "0 12px",
                fontSize: "12px",
                fontWeight: "500",
                borderRadius: "8px",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                background: "rgba(6, 182, 212, 0.1)",
                color: "#22d3ee",
                cursor: "pointer",
                transition: "all 150ms ease",
                height: "30px",
                minWidth: "auto",
                lineHeight: "30px",
              }
            : {
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: "600",
                borderRadius: "12px",
                border: "1px solid #3f3f46",
                background: "#27272a",
                color: "#fafafa",
                cursor: "pointer",
                transition: "all 150ms ease",
              },
        }}
      />
    );
  }

  // Connected state - show custom button with dropdown
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 transition-all cursor-pointer"
      >
        {/* Chain icon */}
        {activeChain && (
          <>
            <Image
              src="/images/base.svg"
              alt={activeChain.name || "Chain"}
              width={18}
              height={18}
              className="rounded-full"
            />
            <div className="w-px h-5 bg-zinc-600" />
          </>
        )}

        {/* Avatar and name */}
        <div className="flex items-center gap-2">
          <AccountAvatar
            address={activeAccount.address}
            avatarUrl={displayInfo?.avatarUrl || null}
            size={20}
          />
          <span className="text-zinc-100">
            {displayInfo?.displayName || displayInfo?.shortAddress}
          </span>
        </div>

        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${
            isMenuOpen ? "rotate-180" : ""
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

      <AccountMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        address={activeAccount.address}
        triggerRef={triggerRef}
        chainName={isTestnet ? "Base Sepolia" : "Base"}
        onDisconnect={handleDisconnect}
        onAction={onAction}
      />
    </div>
  );
}

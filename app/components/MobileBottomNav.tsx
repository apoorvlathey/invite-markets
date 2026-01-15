"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";
import { blo } from "blo";
import Image from "next/image";
import { ConnectButton } from "./ConnectButton/ConnectButton";
import { Home, BarChart3, Zap, Calendar, User } from "lucide-react";
import {
  useResolveAddresses,
  getSellerDisplayInfo,
} from "@/lib/resolve-addresses";

export function MobileBottomNav() {
  const pathname = usePathname();
  const activeAccount = useActiveAccount();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg shadow-[0_-4px_12px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-around px-4 py-3 max-w-screen-sm mx-auto">
        <NavItem icon={Home} label="Home" href="/" isActive={isActive("/")} />
        <NavItem
          icon={BarChart3}
          label="Apps"
          href="/apps"
          isActive={isActive("/apps")}
        />
        <NavItem
          icon={Zap}
          label="Sell"
          href="/sell"
          isActive={isActive("/sell")}
        />
        <NavItem
          icon={Calendar}
          label="Sales"
          href="/sales"
          isActive={isActive("/sales")}
        />
        <ProfileNavItem
          activeAccount={activeAccount}
          isActive={
            activeAccount?.address
              ? pathname === `/profile/${activeAccount.address}`
              : false
          }
        />
      </div>
    </nav>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  isActive,
}: {
  icon: any;
  label: string;
  href: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors cursor-pointer"
    >
      <Icon
        className={`w-5 h-5 transition-colors ${
          isActive ? "text-cyan-400" : "text-zinc-500"
        }`}
      />
      <span
        className={`text-xs font-medium transition-colors ${
          isActive ? "text-cyan-400" : "text-zinc-500"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

function ProfileNavItem({
  activeAccount,
  isActive,
}: {
  activeAccount: any;
  isActive: boolean;
}) {
  // Resolve address to get avatar URL (for Farcaster/ENS profiles)
  const { resolvedAddresses } = useResolveAddresses(
    activeAccount?.address ? [activeAccount.address] : []
  );

  if (activeAccount?.address) {
    const displayInfo = getSellerDisplayInfo(
      activeAccount.address,
      resolvedAddresses
    );
    const avatarUrl = displayInfo.avatarUrl || blo(activeAccount.address as `0x${string}`);

    return (
      <Link
        href={`/profile/${activeAccount.address}`}
        className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors cursor-pointer"
      >
        <div
          className={`w-6 h-6 rounded-full ring-2 transition-colors ${
            isActive ? "ring-cyan-400" : "ring-zinc-700"
          }`}
        >
          <Image
            src={avatarUrl}
            alt="Profile"
            width={24}
            height={24}
            className="rounded-full"
          />
        </div>
        <span
          className={`text-xs font-medium transition-colors ${
            isActive ? "text-cyan-400" : "text-zinc-500"
          }`}
        >
          Profile
        </span>
      </Link>
    );
  }

  // When not connected, show ConnectButton styled as a nav item
  return (
    <div className="flex flex-col items-center gap-1 py-2 px-3">
      <div className="flex items-center justify-center">
        <ConnectButton compact />
      </div>
    </div>
  );
}

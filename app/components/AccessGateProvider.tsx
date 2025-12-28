"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { WaitlistModal } from "./WaitlistModal";

interface AccessGateContextType {
  hasAccess: boolean;
  isLoading: boolean;
  isWhitelistMode: boolean;
  refreshAccess: () => Promise<void>;
}

const AccessGateContext = createContext<AccessGateContextType>({
  hasAccess: true,
  isLoading: true,
  isWhitelistMode: false,
  refreshAccess: async () => {},
});

export const useAccessGate = () => useContext(AccessGateContext);

interface AccessGateProviderProps {
  children: React.ReactNode;
}

export function AccessGateProvider({ children }: AccessGateProviderProps) {
  const [hasAccess, setHasAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isWhitelistMode, setIsWhitelistMode] = useState(false);
  const pathname = usePathname();

  // Check if current path is the invite verification route
  const isInvitePath = pathname?.startsWith("/invite/");
  // Admin page should always be accessible for authentication
  const isAdminPath = pathname === "/admin";

  const checkAccess = useCallback(async () => {
    // Quick check: if not in whitelist mode via env var, skip API call
    if (process.env.NEXT_PUBLIC_IS_ONLY_WHITELIST !== "true") {
      setHasAccess(true);
      setIsWhitelistMode(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/access/check");
      const data = await response.json();

      setHasAccess(data.hasAccess);
      setIsWhitelistMode(data.isWhitelistMode);
    } catch (error) {
      console.error("Error checking access:", error);
      // In whitelist mode, fail closed on error to avoid granting unintended access
      setHasAccess(false);
      setIsWhitelistMode(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // If loading, show nothing (prevents flash)
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If in whitelist mode and no access, but not on invite/admin paths, show waitlist
  if (isWhitelistMode && !hasAccess && !isInvitePath && !isAdminPath) {
    return <WaitlistModal />;
  }

  // Has access or on special paths, render children
  return (
    <AccessGateContext.Provider
      value={{ hasAccess, isLoading, isWhitelistMode, refreshAccess: checkAccess }}
    >
      {children}
    </AccessGateContext.Provider>
  );
}


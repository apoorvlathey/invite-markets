"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
} from "thirdweb/react";
import { signMessage } from "thirdweb/utils";
import { ConnectButton } from "@/app/components/ConnectButton";
import {
  Users,
  Loader2,
  RefreshCw,
  LogOut,
  Shield,
  AlertCircle,
  Mail,
  Calendar,
  ExternalLink,
  ArrowUpDown,
} from "lucide-react";

interface WaitlistEntry {
  email: string;
  xUsername?: string;
  createdAt: string;
}

export function AdminClient() {
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sortByXHandle, setSortByXHandle] = useState(false);

  // Store the signature and message for API calls
  const [authData, setAuthData] = useState<{
    signature: string;
    message: string;
  } | null>(null);

  // Sort entries by X handle alphabetically (empty handles at bottom)
  const sortedEntries = useMemo(() => {
    if (!sortByXHandle) return entries;
    
    return [...entries].sort((a, b) => {
      // Both have X handles - sort alphabetically
      if (a.xUsername && b.xUsername) {
        return a.xUsername.toLowerCase().localeCompare(b.xUsername.toLowerCase());
      }
      // a has handle, b doesn't - a comes first
      if (a.xUsername && !b.xUsername) return -1;
      // b has handle, a doesn't - b comes first
      if (!a.xUsername && b.xUsername) return 1;
      // Neither has handle - maintain original order
      return 0;
    });
  }, [entries, sortByXHandle]);

  const handleVerifyAdmin = useCallback(async () => {
    if (!activeAccount) return;

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const timestamp = Date.now();
      const message = `Sign in to invite.markets admin\nTimestamp: ${timestamp}\nAddress: ${activeAccount.address}`;

      // Request signature from user using Thirdweb
      const signature = await signMessage({
        account: activeAccount,
        message,
      });

      // Verify with backend
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: activeAccount.address,
          message,
          signature,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setIsAdmin(true);
      setAuthData({ signature, message });
    } catch (error) {
      console.error("Admin verification error:", error);
      setVerifyError(
        error instanceof Error ? error.message : "Verification failed"
      );
      setIsAdmin(false);
    } finally {
      setIsVerifying(false);
    }
  }, [activeAccount]);

  const fetchWaitlist = useCallback(async () => {
    if (!authData || !activeAccount?.address) return;

    setIsLoading(true);
    setFetchError(null);

    try {
      // Base64 encode the message since it contains newlines
      const encodedMessage = btoa(authData.message);
      
      const response = await fetch("/api/waitlist", {
        method: "GET",
        headers: {
          "x-admin-signature": authData.signature,
          "x-admin-message": encodedMessage,
          "x-admin-address": activeAccount.address,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch waitlist");
      }

      setEntries(data.entries);
    } catch (error) {
      console.error("Fetch waitlist error:", error);
      setFetchError(
        error instanceof Error ? error.message : "Failed to fetch waitlist"
      );
    } finally {
      setIsLoading(false);
    }
  }, [authData, activeAccount?.address]);

  // Fetch waitlist when authenticated
  useEffect(() => {
    if (isAdmin && authData) {
      fetchWaitlist();
    }
  }, [isAdmin, authData, fetchWaitlist]);

  // Reset state when wallet disconnects
  useEffect(() => {
    if (!activeAccount) {
      setIsAdmin(false);
      setAuthData(null);
      setEntries([]);
    }
  }, [activeAccount]);

  const handleDisconnect = () => {
    if (activeWallet) {
      disconnect(activeWallet);
    }
    setIsAdmin(false);
    setAuthData(null);
    setEntries([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Not connected state
  if (!activeAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-cyan-500/20 border border-cyan-500/40">
            <Shield className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Admin Access
          </h1>
          <p className="text-zinc-400 text-lg mb-8">
            Connect your admin wallet to access the waitlist dashboard.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </motion.div>
      </div>
    );
  }

  // Connected but not verified state
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-cyan-500/20 border border-cyan-500/40">
            <Shield className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Verify Admin Access
          </h1>
          <p className="text-zinc-400 text-lg mb-2">
            Sign a message to verify your admin privileges.
          </p>
          <p className="text-zinc-500 text-sm mb-8 font-mono">
            Connected: {activeAccount.address.slice(0, 6)}...
            {activeAccount.address.slice(-4)}
          </p>

          {verifyError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{verifyError}</span>
            </motion.div>
          )}

          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleVerifyAdmin}
              disabled={isVerifying}
              className="w-full py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Sign to Verify
                </>
              )}
            </motion.button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Disconnect Wallet
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Authenticated admin state - show dashboard
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Waitlist Dashboard
              </h1>
              <p className="text-zinc-400">
                {entries.length} {entries.length === 1 ? "entry" : "entries"} on
                the waitlist
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSortByXHandle(!sortByXHandle)}
                className={`px-3 py-2.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-2 text-sm font-medium ${
                  sortByXHandle
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100"
                }`}
                title="Sort by X handle"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden sm:inline">Sort by X</span>
              </button>
              <button
                onClick={fetchWaitlist}
                disabled={isLoading}
                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-5 h-5 text-zinc-400 ${
                    isLoading ? "animate-spin" : ""
                  }`}
                />
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer flex items-center gap-2 text-zinc-400 hover:text-zinc-100"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Disconnect</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Error State */}
        {fetchError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{fetchError}</span>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && entries.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-zinc-900 border border-zinc-800">
              <Users className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-lg">No waitlist entries yet</p>
          </motion.div>
        )}

        {/* Entries Table */}
        <AnimatePresence>
          {entries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden"
            >
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-900/50 border-b border-zinc-800 text-sm font-medium text-zinc-400">
                <div className="col-span-5 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </div>
                <div className="col-span-3">X Handle</div>
                <div className="col-span-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Joined
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-zinc-800/50">
                {sortedEntries.map((entry, index) => (
                  <motion.div
                    key={entry.email}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-900/30 transition-colors"
                  >
                    <div className="col-span-5 text-zinc-100 font-mono text-sm truncate">
                      {entry.email}
                    </div>
                    <div className="col-span-3">
                      {entry.xUsername ? (
                        <a
                          href={`https://x.com/${entry.xUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                        >
                          @{entry.xUsername}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-sm">—</span>
                      )}
                    </div>
                    <div className="col-span-4 text-zinc-500 text-sm">
                      {formatDate(entry.createdAt)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


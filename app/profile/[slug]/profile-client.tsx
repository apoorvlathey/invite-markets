"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { blo } from "blo";
import {
  useResolveAddresses,
  getSellerDisplayInfo,
} from "@/lib/resolve-addresses";
import { getExplorerAddressUrl } from "@/lib/chain";
import { fetchEthosData, type EthosData } from "@/lib/ethos-scores";

interface ProfileClientProps {
  address: string;
}

// Helper function to get trust level color and label
function getTrustLevelConfig(level: string) {
  const normalizedLevel = level.toLowerCase();

  switch (normalizedLevel) {
    case "trusted":
      return {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        dot: "bg-emerald-400",
        label: "Trusted",
      };
    case "neutral":
      return {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        text: "text-blue-400",
        dot: "bg-blue-400",
        label: "Neutral",
      };
    case "questionable":
      return {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        text: "text-yellow-400",
        dot: "bg-yellow-400",
        label: "Questionable",
      };
    case "untrusted":
      return {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-400",
        dot: "bg-red-400",
        label: "Untrusted",
      };
    default:
      return {
        bg: "bg-zinc-500/10",
        border: "border-zinc-500/30",
        text: "text-zinc-400",
        dot: "bg-zinc-400",
        label: "Unknown",
      };
  }
}

// Copy button with feedback
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer text-sm font-medium"
    >
      {copied ? (
        <>
          <svg
            className="w-4 h-4 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-zinc-300">{label}</span>
        </>
      )}
    </button>
  );
}

export default function ProfileClient({ address }: ProfileClientProps) {
  const router = useRouter();
  const { resolvedAddresses, isLoading } = useResolveAddresses([address]);
  const displayInfo = getSellerDisplayInfo(address, resolvedAddresses);
  const [ethosData, setEthosData] = useState<EthosData | null>(null);

  // Generate blockie avatar as fallback
  const bloAvatar = blo(address as `0x${string}`);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch Ethos data
  useEffect(() => {
    fetchEthosData([address]).then((data) => {
      setEthosData(data[address.toLowerCase()] ?? null);
    });
  }, [address]);

  const trustLevelConfig = ethosData
    ? getTrustLevelConfig(ethosData.level)
    : null;

  return (
    <div className="min-h-screen text-zinc-100">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "6s", animationDelay: "1s" }}
        />
      </div>

      <div className="max-w-2xl mx-auto py-16 px-4 md:px-6">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-zinc-950 border border-zinc-800 shadow-premium overflow-hidden"
        >
          {/* Header gradient */}
          <div className="h-24 bg-linear-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[40px_40px]" />
          </div>

          {/* Avatar */}
          <div className="px-8 -mt-12 relative z-10">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-zinc-950 shadow-xl">
                {isLoading ? (
                  <div className="w-full h-full bg-zinc-800 animate-pulse" />
                ) : (
                  <Image
                    src={displayInfo.avatarUrl || bloAvatar}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {/* Resolution type badge */}
              {displayInfo.resolvedType && (
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-medium text-cyan-400 capitalize">
                  {displayInfo.resolvedType}
                </div>
              )}
            </motion.div>
          </div>

          {/* Info section */}
          <div className="px-8 pt-4 pb-8">
            {/* Display name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {isLoading ? (
                <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse mb-2" />
              ) : (
                <h1 className="text-2xl font-bold text-white mb-1">
                  {displayInfo.displayName}
                </h1>
              )}

              {/* Show full address if display name is different */}
              {displayInfo.displayName !== displayInfo.shortAddress && (
                <p className="text-sm text-zinc-500 font-mono">
                  {displayInfo.shortAddress}
                </p>
              )}
            </motion.div>

            {/* Ethos Score & Trust Level */}
            {ethosData && trustLevelConfig && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-6"
              >
                <a
                  href={`https://app.ethos.network/profile/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl ${trustLevelConfig.bg} border ${trustLevelConfig.border} hover:border-opacity-70 transition-colors cursor-pointer group`}
                >
                  <Image
                    src="/images/ethos.svg"
                    alt="Ethos"
                    width={24}
                    height={24}
                    className="opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${trustLevelConfig.dot}`}
                      />
                      <span
                        className={`text-lg font-bold ${trustLevelConfig.text}`}
                      >
                        {ethosData.score}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-zinc-700" />
                    <span
                      className={`text-sm font-semibold ${trustLevelConfig.text}`}
                    >
                      {trustLevelConfig.label}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 ${trustLevelConfig.text} opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-1`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </motion.div>
            )}

            {/* Full address */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
            >
              <p className="text-xs text-zinc-500 mb-2 font-medium">
                Wallet Address
              </p>
              <p className="font-mono text-sm text-zinc-300 break-all">
                {address}
              </p>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <CopyButton text={address} label="Copy Address" />

              <a
                href={getExplorerAddressUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer text-sm font-medium text-zinc-300"
              >
                <svg
                  className="w-4 h-4 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                View on Explorer
              </a>

              {/* Link to Farcaster if Farcaster user */}
              {displayInfo.resolvedType === "farcaster" && (
                <a
                  href={`https://farcaster.xyz/${displayInfo.displayName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer text-sm font-medium text-purple-300"
                >
                  <Image
                    src="/farcaster-logo.svg"
                    alt="Farcaster"
                    width={16}
                    height={16}
                    className="opacity-80"
                  />
                  View on Farcaster
                </a>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Additional info section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-6"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-1">
                About this profile
              </h3>
              <p className="text-sm text-zinc-500">
                This is a public profile page for this wallet address on
                invite.markets. Identity is resolved from{" "}
                {displayInfo.resolvedType === "farcaster"
                  ? "Farcaster"
                  : displayInfo.resolvedType === "basename"
                  ? "Base Names"
                  : displayInfo.resolvedType === "ens"
                  ? "ENS"
                  : "the blockchain"}
                .
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

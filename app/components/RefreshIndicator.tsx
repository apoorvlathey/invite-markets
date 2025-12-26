"use client";

import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";

export const AUTO_REFRESH_INTERVAL = 60; // seconds

interface RefreshIndicatorProps {
  countdown: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function RefreshIndicator({
  countdown,
  isRefreshing,
  onRefresh,
}: RefreshIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Countdown display */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span className="hidden sm:inline">Refreshing in</span>
        <div className="relative flex items-center justify-center">
          {/* Circular progress indicator */}
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            {/* Background circle */}
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-zinc-800"
            />
            {/* Progress circle */}
            <motion.circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="url(#countdownGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 14}
              initial={{ strokeDashoffset: 0 }}
              animate={{
                strokeDashoffset:
                  2 * Math.PI * 14 * (1 - countdown / AUTO_REFRESH_INTERVAL),
              }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
            <defs>
              <linearGradient
                id="countdownGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          {/* Countdown number */}
          <span className="absolute text-xs font-medium text-zinc-300">
            <NumberFlow
              value={countdown}
              format={{ minimumIntegerDigits: 2 }}
            />
          </span>
        </div>
      </div>

      {/* Manual refresh button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="relative p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group hover:scale-105 active:scale-95"
        title="Refresh now"
      >
        <svg
          className={`w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors ${
            isRefreshing ? "animate-spin" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>

        {/* Subtle pulse effect when refreshing */}
        {isRefreshing && (
          <span className="absolute inset-0 rounded-lg border border-cyan-500/30 animate-ping" />
        )}
      </button>
    </div>
  );
}

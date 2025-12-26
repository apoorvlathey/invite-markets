"use client";

import { motion } from "framer-motion";

interface QuickBuyButtonProps {
  price: string;
  isPending: boolean;
  onBuy: () => void;
  compact?: boolean;
}

/**
 * Quick buy button component for listing cards.
 * Shows price and handles the buy action.
 */
export function QuickBuyButton({
  price,
  isPending,
  onBuy,
  compact = false,
}: QuickBuyButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault(); // Prevent card link navigation
        e.stopPropagation(); // Stop event bubbling
        onBuy();
      }}
      className={`rounded-lg font-semibold bg-linear-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:via-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        compact ? "py-2 px-3 text-sm min-w-[100px]" : "flex-1 py-3 px-4"
      }`}
    >
      <span className="text-black flex items-center justify-center gap-2">
        {isPending ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {!compact && "Processing..."}
          </>
        ) : (
          <>
            Buy {price}
            {!compact && (
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            )}
          </>
        )}
      </span>
    </motion.button>
  );
}

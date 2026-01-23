"use client";

import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";

interface ThemeToggleProps {
  compact?: boolean;
  showLabel?: boolean;
}

export function ThemeToggle({ compact = false, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const buttonClass = compact
    ? `p-2 rounded-lg border transition-all ${
        isLight
          ? "border-zinc-300 bg-zinc-100 hover:bg-zinc-200"
          : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
      }`
    : `flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
        isLight
          ? "border-zinc-300 bg-zinc-100 hover:bg-zinc-200"
          : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
      }`;

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      className={buttonClass}
    >
      <AnimatePresence mode="wait">
        {resolvedTheme === "dark" ? (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-5 h-5 text-yellow-400" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-5 h-5 text-purple-500" />
          </motion.div>
        )}
      </AnimatePresence>
      {showLabel && (
        <span className={`text-sm font-medium ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>
          Theme
        </span>
      )}
    </button>
  );
}

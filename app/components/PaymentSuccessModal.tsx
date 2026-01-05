"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Copy,
  Check,
  X,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  inviteUrl: string;
  sellerAddress: string | null;
  onClose: () => void;
}

export function PaymentSuccessModal({
  isOpen,
  inviteUrl,
  sellerAddress,
  onClose,
}: PaymentSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setHasCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCloseAttempt = () => {
    if (hasCopied) {
      onClose();
    } else {
      setShowConfirmClose(true);
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseAttempt}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Confirmation Modal */}
          <AnimatePresence>
            {showConfirmClose && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowConfirmClose(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-60"
                />
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative bg-zinc-900 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
                  >
                    {/* Gradient border effect */}
                    <div className="absolute inset-0 rounded-2xl p-px bg-linear-to-b from-yellow-500/40 via-yellow-600/20 to-transparent">
                      <div className="w-full h-full bg-zinc-900 rounded-2xl" />
                    </div>

                    {/* Content */}
                    <div className="relative p-6">
                      {/* Warning icon with glow */}
                      <div className="flex justify-center mb-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 300,
                            delay: 0.1,
                          }}
                          className="relative"
                        >
                          <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-xl" />
                          <div className="relative p-4 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                            <AlertTriangle className="h-8 w-8 text-yellow-400" />
                          </div>
                        </motion.div>
                      </div>

                      {/* Title */}
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-xl font-bold text-center text-zinc-100 mb-3"
                      >
                        Wait! Are you sure?
                      </motion.h3>

                      {/* Description */}
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-center text-zinc-400 mb-6 leading-relaxed"
                      >
                        You haven&apos;t copied your invite link yet.
                        <br />
                        <span className="text-yellow-400 font-semibold">
                          This link will be lost forever.
                        </span>
                      </motion.p>

                      {/* Buttons */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex flex-col gap-3"
                      >
                        <button
                          onClick={() => setShowConfirmClose(false)}
                          className="w-full px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 hover:border-emerald-400 rounded-xl font-semibold text-emerald-400 transition-all cursor-pointer"
                        >
                          Go Back & Copy Link
                        </button>
                        <button
                          onClick={handleConfirmClose}
                          className="w-full px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl font-medium text-zinc-400 hover:text-zinc-300 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Close Anyway
                        </button>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-100">
                      Payment Successful!
                    </h2>
                  </div>
                  <button
                    onClick={handleCloseAttempt}
                    className="text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-yellow-400 mb-1">
                    ⚠️ Important: This link will only be displayed once
                  </p>
                  <p className="text-xs text-yellow-300/80">
                    Please copy and save it now. You won&apos;t be able to
                    access it again.
                  </p>
                </div>

                {/* Invite URL */}
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-2 block">
                    Your Invite Link:
                  </label>
                  <div className="flex gap-2 items-stretch">
                    {/* Animated border container */}
                    <div className="relative flex-1 p-[2px]">
                      {/* Rotating gradient - uses a larger square that rotates */}
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        {/* Single rotating beam with layered glow */}
                        <motion.div
                          className="absolute top-1/2 left-1/2 w-[200%] aspect-square -translate-x-1/2 -translate-y-1/2"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          {/* Core bright line - vivid colors */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, #00ffff 315deg, #00d4ff 325deg, #0099ff 335deg, #a855f7 345deg, #ff00ff 352deg, #ffffff 357deg, transparent 360deg)",
                            }}
                          />
                          {/* Inner glow - saturated */}
                          <div
                            className="absolute inset-0 blur-xs"
                            style={{
                              background:
                                "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, #00ffff 315deg, #00d4ff 325deg, #0099ff 335deg, #a855f7 345deg, #ff00ff 352deg, #ffffff 357deg, transparent 360deg)",
                            }}
                          />
                          {/* Outer glow - wide and bright */}
                          <div
                            className="absolute inset-0 blur-lg"
                            style={{
                              background:
                                "conic-gradient(from 0deg, transparent 0deg, transparent 295deg, #00ffff 315deg, #0099ff 335deg, #a855f7 348deg, #ff00ff 355deg, transparent 360deg)",
                            }}
                          />
                        </motion.div>
                      </div>
                      {/* Subtle base border */}
                      <div className="absolute inset-[1px] rounded-[7px] bg-zinc-700/30" />
                      {/* Input */}
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="relative w-full h-full px-3 py-2.5 bg-zinc-900 rounded-[6px] text-sm font-mono text-zinc-100 focus:outline-none"
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopy}
                      className={`px-4 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                        copied
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-100"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Rate Seller on Ethos */}
                {sellerAddress && (
                  <a
                    href={`https://app.ethos.network/profile/${sellerAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-emerald-500/10 via-zinc-800/80 to-rose-500/10 hover:from-emerald-500/20 hover:via-zinc-700/80 hover:to-rose-500/20 border border-zinc-600/50 hover:border-zinc-500 rounded-lg transition-all group"
                  >
                    <ThumbsUp className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                    <div className="flex items-center gap-2">
                      <Image
                        src="/images/ethos.svg"
                        alt="Ethos"
                        width={18}
                        height={18}
                        className="opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                        Rate Seller on Ethos
                      </span>
                    </div>
                    <ThumbsDown className="w-4 h-4 text-rose-400 group-hover:text-rose-300 transition-colors" />
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

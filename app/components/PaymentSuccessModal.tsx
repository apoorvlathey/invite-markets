"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Copy, Check, X, AlertTriangle } from "lucide-react";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  inviteUrl: string;
  onClose: () => void;
}

export function PaymentSuccessModal({
  isOpen,
  inviteUrl,
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
                  className="fixed inset-0 bg-black/60 z-60"
                />
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-sm w-full shadow-2xl p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-100">
                        Are you sure?
                      </h3>
                    </div>
                    <p className="text-sm text-zinc-400 mb-6">
                      You haven&apos;t copied your invite link yet. Once you
                      close this modal,
                      <span className="text-red-400 font-medium">
                        {" "}
                        you won&apos;t be able to access it again
                      </span>
                      .
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleConfirmClose}
                        className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg font-medium text-zinc-100 transition-colors cursor-pointer"
                      >
                        Close Anyway
                      </button>
                      <button
                        onClick={() => setShowConfirmClose(false)}
                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg font-medium text-red-400 transition-colors cursor-pointer"
                      >
                        Go Back
                      </button>
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
                  <div className="flex gap-2">
                    {/* Animated border container */}
                    <div className="relative flex-1">
                      {/* Rotating gradient - uses a larger square that rotates */}
                      <div className="absolute -inset-[2px] rounded-lg overflow-hidden">
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
                      <div className="absolute -inset-px rounded-lg bg-zinc-700/30" />
                      {/* Input */}
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="relative w-full px-3 py-2 bg-zinc-900 rounded-lg text-sm font-mono text-zinc-100 focus:outline-none"
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

                {/* Close Button */}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

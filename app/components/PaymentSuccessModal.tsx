"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Copy, Check, X, AlertTriangle } from "lucide-react";
import { EthosRateButton } from "./EthosRateButton";

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
          {/* Backdrop - uses modal-backdrop class for mobile optimization */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseAttempt}
            className="fixed inset-0 modal-backdrop z-50"
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
                  className="fixed inset-0 modal-backdrop z-60"
                />
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="relative bg-zinc-900 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
                  >
                    {/* Gradient border effect */}
                    <div className="absolute inset-0 rounded-2xl p-px bg-linear-to-b from-yellow-500/40 via-yellow-600/20 to-transparent">
                      <div className="w-full h-full bg-zinc-900 rounded-2xl" />
                    </div>

                    {/* Content */}
                    <div className="relative p-6">
                      {/* Warning icon */}
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-xl" />
                          <div className="relative p-4 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                            <AlertTriangle className="h-8 w-8 text-yellow-400" />
                          </div>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-center text-zinc-100 mb-3">
                        Wait! Are you sure?
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-center text-zinc-400 mb-6 leading-relaxed">
                        You haven&apos;t copied your invite link yet.
                        <br />
                        <span className="text-yellow-400 font-semibold">
                          This link will be lost forever.
                        </span>
                      </p>

                      {/* Buttons */}
                      <div className="flex flex-col gap-3">
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
                      </div>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
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
                    {/* Static gradient border - no animation for mobile performance */}
                    <div className="relative flex-1 p-[2px] rounded-lg bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500">
                      {/* Input */}
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="relative w-full h-full px-3 py-2.5 bg-zinc-900 rounded-[6px] text-sm font-mono text-zinc-100 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleCopy}
                      className={`hover-scale px-4 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer active:scale-95 ${
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
                    </button>
                  </div>
                </div>

                {/* Rate Seller on Ethos */}
                {sellerAddress && (
                  <EthosRateButton
                    address={sellerAddress}
                    label="Rate Seller on Ethos"
                  />
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

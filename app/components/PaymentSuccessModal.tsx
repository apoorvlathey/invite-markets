'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Copy, Check, X } from 'lucide-react';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  inviteUrl: string;
  onClose: () => void;
}

export function PaymentSuccessModal({ isOpen, inviteUrl, onClose }: PaymentSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

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
                    onClick={onClose}
                    className="text-zinc-400 hover:text-zinc-100 transition-colors"
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
                    Please copy and save it now. You won't be able to access it again.
                  </p>
                </div>

                {/* Invite URL */}
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-2 block">
                    Your Invite Link:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-mono text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopy}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-100 font-medium transition-colors flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
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
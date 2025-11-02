"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import axios from "axios";
import { withPaymentInterceptor } from "x402-axios";

interface RandomNumberResult {
  success: boolean;
  randomNumber: number;
  range: { min: number; max: number };
  timestamp: string;
  cost: string;
  network: string;
}

export function RandomNumberGenerator() {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RandomNumberResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletClient) {
      setError("Wallet client not available. Please try reconnecting.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Create axios instance with x402 payment interceptor
      const axiosInstance = withPaymentInterceptor(
        axios.create(),
        walletClient as unknown as Parameters<typeof withPaymentInterceptor>[1]
      );

      // Make request to the payment-gated API
      const response = await axiosInstance.post<RandomNumberResult>(
        "/api/random",
        { min, max },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setResult(response.data);
    } catch (err) {
      console.error("Error generating random number:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : (
              err as {
                response?: { data?: { error?: string } };
                message?: string;
              }
            )?.response?.data?.error ||
            (err as { message?: string })?.message ||
            "Failed to generate random number";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-linear-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-blue-700/50 p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            Try it Live
          </h2>
          <p className="text-sm text-zinc-400">
            Connect your wallet and generate a random number for 0.01 USDC
          </p>
        </div>
        <ConnectButton />
      </div>

      {isConnected ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="min"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Minimum Value
              </label>
              <input
                type="number"
                id="min"
                value={min}
                onChange={(e) => setMin(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="max"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Maximum Value
              </label>
              <input
                type="number"
                id="max"
                value={max}
                onChange={(e) => setMax(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">Cost per request:</span>
              <span className="text-blue-400 font-semibold">0.01 USDC</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? "Processing Payment..." : "Generate Random Number"}
          </button>
        </form>
      ) : (
        <div className="text-center py-8">
          <p className="text-zinc-400">
            Connect your wallet using the button above to get started
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
          <p className="text-red-400 text-sm font-medium">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <p className="text-green-400 font-semibold">Success!</p>
          </div>
          <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

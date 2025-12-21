"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useSignTypedData, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  getEIP712Domain,
  EIP712_TYPES,
  type ListingMessage,
} from "@/lib/signature";

export default function SellerPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const [formData, setFormData] = useState({
    inviteUrl: "",
    priceUsdc: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate a nonce (timestamp) to prevent replay attacks
      const nonce = BigInt(Date.now());

      // Prepare the message to sign
      const message: ListingMessage = {
        inviteUrl: formData.inviteUrl,
        priceUsdc: formData.priceUsdc,
        sellerAddress: address,
        nonce,
      };

      // Sign the typed data
      const signature = await signTypedDataAsync({
        domain: getEIP712Domain(chainId),
        types: EIP712_TYPES,
        primaryType: "CreateListing",
        message,
      });

      // Submit to backend with signature
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteUrl: formData.inviteUrl,
          priceUsdc: parseFloat(formData.priceUsdc),
          sellerAddress: address,
          nonce: nonce.toString(),
          chainId,
          signature,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create listing");
      }

      setCreatedSlug(data.listing.slug);
    } catch (err) {
      if (err instanceof Error) {
        // Check if user rejected the signature
        if (
          err.message.includes("User rejected") ||
          err.message.includes("user rejected")
        ) {
          setError(
            "Signature rejected. Please sign the message to create a listing."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to create listing");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (createdSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Listing Created!
            </h2>
            <p className="text-gray-600 mb-6">
              Your invite is now listed on the marketplace
            </p>
            <button
              onClick={() => router.push(`/listing/${createdSlug}`)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              View Your Listing
            </button>
            <button
              onClick={() => {
                setCreatedSlug("");
                setFormData({ inviteUrl: "", priceUsdc: "" });
              }}
              className="w-full mt-3 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Create Another Listing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-4">
          <ConnectButton />
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create a Listing
          </h1>
          <p className="text-gray-600 mb-8">
            Sell your invite link on the marketplace
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="inviteUrl"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Invite URL
              </label>
              <input
                type="url"
                id="inviteUrl"
                name="inviteUrl"
                value={formData.inviteUrl}
                onChange={handleChange}
                required
                placeholder="https://..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label
                htmlFor="priceUsdc"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Price (USDC)
              </label>
              <input
                type="number"
                id="priceUsdc"
                name="priceUsdc"
                value={formData.priceUsdc}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="10.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {isConnected && address && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Payment recipient:</span>{" "}
                  <span className="font-mono text-blue-600">{address}</span>
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !isConnected}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {!isConnected
                ? "Connect Wallet to Continue"
                : isSubmitting
                ? "Creating Listing..."
                : "Create Listing"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

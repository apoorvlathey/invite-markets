"use client";

import { useState } from "react";
import { createThirdwebClient } from "thirdweb";
import { useFetchWithPayment } from "thirdweb/react";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { useToast } from "@/app/components/Toast";
import { type ListingType } from "@/lib/signature";

const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

// Query key used by the homepage for listings - exported for consistency
export const LISTINGS_QUERY_KEY = ["listings"];

export interface PurchaseResult {
  listingType: ListingType;
  inviteUrl?: string;
  appUrl?: string;
  accessCode?: string;
}

interface UsePurchaseResult {
  purchase: (slug: string, sellerAddress: string) => Promise<PurchaseResult | null>;
  isPending: boolean;
  purchaseData: PurchaseResult | null;
  purchasedSellerAddress: string | null;
  showSuccessModal: boolean;
  closeSuccessModal: () => void;
}

/**
 * Trigger a celebratory confetti burst on successful purchase.
 */
function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
}

/**
 * Hook to handle the purchase flow for a listing.
 * Abstracts the payment logic so it can be used in both listing page and quick buy.
 */
export function usePurchase(): UsePurchaseResult {
  const { fetchWithPayment, isPending } = useFetchWithPayment(thirdwebClient);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [purchaseData, setPurchaseData] = useState<PurchaseResult | null>(null);
  const [purchasedSellerAddress, setPurchasedSellerAddress] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const purchase = async (
    slug: string,
    sellerAddress: string
  ): Promise<PurchaseResult | null> => {
    console.log(`[x402 CLIENT] Starting purchase for slug: ${slug}, seller: ${sellerAddress}`);
    
    try {
      console.log(`[x402 CLIENT] Calling fetchWithPayment...`);
      const res = (await fetchWithPayment(`/api/purchase/${slug}`, {
        method: "POST",
      })) as PurchaseResult | undefined;

      console.log(`[x402 CLIENT] fetchWithPayment response:`, res);

      if (res?.listingType) {
        // Check if we got valid data based on listing type
        const hasValidData = 
          (res.listingType === "invite_link" && res.inviteUrl) ||
          (res.listingType === "access_code" && res.appUrl && res.accessCode);

        console.log(`[x402 CLIENT] Response validation:`, { listingType: res.listingType, hasValidData });

        if (hasValidData) {
          // Celebrate successful purchase with confetti!
          triggerConfetti();

          // Invalidate the listings cache so homepage refreshes on next visit
          queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });

          setPurchaseData(res);
          setPurchasedSellerAddress(sellerAddress);
          setShowSuccessModal(true);
          console.log(`[x402 CLIENT] Purchase successful!`);
          return res;
        }
      }
      console.log(`[x402 CLIENT] No valid data in response`);
      return null;
    } catch (error) {
      console.error(`[x402 CLIENT] Purchase error:`, error);
      // Log more details if it's an Error object
      if (error instanceof Error) {
        console.error(`[x402 CLIENT] Error details:`, {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      showToast("Payment failed or cancelled");
      return null;
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setPurchaseData(null);
    setPurchasedSellerAddress(null);
  };

  return {
    purchase,
    isPending,
    purchaseData,
    purchasedSellerAddress,
    showSuccessModal,
    closeSuccessModal,
  };
}

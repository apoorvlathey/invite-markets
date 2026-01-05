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
    try {
      const res = (await fetchWithPayment(`/api/purchase/${slug}`, {
        method: "POST",
      })) as PurchaseResult | undefined;

      if (res?.listingType) {
        // Check if we got valid data based on listing type
        const hasValidData = 
          (res.listingType === "invite_link" && res.inviteUrl) ||
          (res.listingType === "access_code" && res.appUrl && res.accessCode);

        if (hasValidData) {
          // Celebrate successful purchase with confetti!
          triggerConfetti();

          // Invalidate the listings cache so homepage refreshes on next visit
          queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });

          setPurchaseData(res);
          setPurchasedSellerAddress(sellerAddress);
          setShowSuccessModal(true);
          return res;
        }
      }
      return null;
    } catch {
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

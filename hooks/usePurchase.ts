"use client";

import { useState } from "react";
import { createThirdwebClient } from "thirdweb";
import { useFetchWithPayment } from "thirdweb/react";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { useToast } from "@/app/components/Toast";

const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

// Query key used by the homepage for listings - exported for consistency
export const LISTINGS_QUERY_KEY = ["listings"];

interface UsePurchaseResult {
  purchase: (slug: string) => Promise<{ inviteUrl: string } | null>;
  isPending: boolean;
  inviteUrl: string | null;
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
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const purchase = async (
    slug: string
  ): Promise<{ inviteUrl: string } | null> => {
    try {
      const res = (await fetchWithPayment(`/api/purchase/${slug}`, {
        method: "POST",
      })) as { inviteUrl?: string } | undefined;

      if (res?.inviteUrl) {
        // Celebrate successful purchase with confetti!
        triggerConfetti();

        // Invalidate the listings cache so homepage refreshes on next visit
        queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });

        setInviteUrl(res.inviteUrl);
        setShowSuccessModal(true);
        return { inviteUrl: res.inviteUrl };
      }
      return null;
    } catch {
      showToast("Payment failed or cancelled");
      return null;
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setInviteUrl(null);
  };

  return {
    purchase,
    isPending,
    inviteUrl,
    showSuccessModal,
    closeSuccessModal,
  };
}

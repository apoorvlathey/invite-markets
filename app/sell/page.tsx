import type { Metadata } from "next";
import SellClient from "./sell-client";

export const metadata: Metadata = {
  title: "Sell Your Invite",
  description:
    "List your exclusive invite link and earn instantly. Sell early access to web3 apps on invite.markets — powered by x402.",
  openGraph: {
    title: "Sell Your Invite | invite.markets",
    description:
      "List your exclusive invite link and earn instantly. Sell early access to web3 apps on invite.markets — powered by x402.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sell Your Invite | invite.markets",
    description:
      "List your exclusive invite link and earn instantly. Sell early access to web3 apps on invite.markets — powered by x402.",
  },
};

export default function SellPage() {
  return <SellClient />;
}

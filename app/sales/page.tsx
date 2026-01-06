import SalesClient from "./sales-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Sales | invite.markets",
  description: "All invite purchases on the marketplace. View real-time on-chain verified transactions with full transparency.",
  openGraph: {
    title: "All Sales | invite.markets",
    description: "All invite purchases on the marketplace. View real-time on-chain verified transactions with full transparency.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Sales | invite.markets",
    description: "All invite purchases on the marketplace. View real-time on-chain verified transactions with full transparency.",
  },
};

export default function SalesPage() {
  return <SalesClient />;
}
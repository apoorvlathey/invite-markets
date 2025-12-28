import type { Metadata } from "next";
import AppsClient from "./apps-client";

export const metadata: Metadata = {
  title: "All Apps | invite.markets",
  description:
    "Browse all apps with invite codes available on invite.markets. Find early access to the hottest web3 apps.",
  openGraph: {
    title: "All Apps | invite.markets",
    description:
      "Browse all apps with invite codes available on invite.markets. Find early access to the hottest web3 apps.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Apps | invite.markets",
    description:
      "Browse all apps with invite codes available on invite.markets. Find early access to the hottest web3 apps.",
  },
};

export default function AppsPage() {
  return <AppsClient />;
}


import { Metadata } from "next";
import ListingsClient from "./listings-client";

export const metadata: Metadata = {
  title: "All Listings | invite.markets",
  description:
    "Browse all available invite listings on invite.markets. Buy early access to the hottest web3 apps.",
};

export default function ListingsPage() {
  return <ListingsClient />;
}

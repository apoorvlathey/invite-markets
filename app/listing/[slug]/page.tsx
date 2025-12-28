import type { Metadata } from "next";
import { getListingBySlug } from "@/lib/listing";
import { featuredApps } from "@/data/featuredApps";
import ListingClient from "./listing-client";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const listing = await getListingBySlug(slug, false);

    if (!listing) {
      return {
        title: "Listing Not Found",
        description: "This listing doesn't exist or has been removed.",
      };
    }

    // Get app name from featured apps or listing
    const app = featuredApps.find((a) => a.id === listing.appId);
    const appName = app?.appName ?? listing.appName ?? "Invite";

    const title = `Buy ${appName} Invite for $${listing.priceUsdc}`;
    const description = `Get early access to ${appName} for just $${listing.priceUsdc} USDC. Instant delivery powered by x402 on Base.`;

    return {
      title,
      description,
      openGraph: {
        title: `${title} | invite.markets`,
        description,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | invite.markets`,
        description,
      },
    };
  } catch {
    return {
      title: "Listing",
      description: "View invite listing on invite.markets",
    };
  }
}

export default function ListingPage() {
  return <ListingClient />;
}

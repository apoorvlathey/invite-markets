import type { Metadata } from "next";
import { featuredApps } from "@/data/featuredApps";
import AppPageClient from "./app-client";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Check if it's a featured app
  const featuredApp = featuredApps.find((a) => a.id === slug);
  const appName = featuredApp?.appName ?? slug;

  const title = `${appName} Invites`;
  const description = featuredApp
    ? `Browse and buy ${appName} invite codes. ${featuredApp.description}`
    : `Browse and buy ${appName} invite codes on invite.markets. Instant delivery powered by x402.`;

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
}

export default function AppPage() {
  return <AppPageClient />;
}

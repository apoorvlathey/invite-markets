import { base, baseSepolia } from "thirdweb/chains";
import { chainId } from "@/lib/chain";

export const featuredApps: {
  id: string;
  appName: string;
  siteUrl: string;
  appIconUrl: string;
  description: string;
  chainIds: number[];
}[] = [
  {
    id: "ethos",
    appName: "Ethos",
    siteUrl: "https://app.ethos.network/",
    appIconUrl: "/images/appIcons/ethos.svg",
    description:
      "Reputation & credibility for crypto, driven by peer-to-peer reviews & secured by staked Ethereum. What’s your crypto credibility score?",
    chainIds: [base.id, baseSepolia.id],
  },
  {
    id: "base-app",
    appName: "Base App",
    siteUrl: "https://join.base.app/",
    appIconUrl: "/images/appIcons/base-app.jpg",
    description:
      "Create, earn, trade, discover apps, and chat with friends all in one place",
    chainIds: [baseSepolia.id],
  },
];

// Helper to get featured apps filtered by the current chain
export const getFeaturedAppsForChain = () =>
  featuredApps.filter((app) => app.chainIds.includes(chainId));

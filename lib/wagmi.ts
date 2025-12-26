import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: false, // Disable SSR to avoid indexedDB errors
});

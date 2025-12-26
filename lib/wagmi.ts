import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === "true";

export const config = isTestnet
  ? createConfig({
      chains: [baseSepolia],
      transports: {
        [baseSepolia.id]: http(),
      },
      ssr: false,
    })
  : createConfig({
      chains: [base],
      transports: {
        [base.id]: http(),
      },
      ssr: false,
    });

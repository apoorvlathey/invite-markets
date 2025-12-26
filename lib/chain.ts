// Chain configuration based on NEXT_PUBLIC_IS_TESTNET environment variable

export const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === "true";

export const chainId = isTestnet ? 84532 : 8453;

export const explorerBaseUrl = isTestnet
  ? "https://sepolia.basescan.org"
  : "https://basescan.org";

export function getExplorerAddressUrl(address: string): string {
  return `${explorerBaseUrl}/address/${address}`;
}

export function getExplorerTxUrl(txHash: string): string {
  return `${explorerBaseUrl}/tx/${txHash}`;
}


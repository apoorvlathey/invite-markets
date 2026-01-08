import { createThirdwebClient } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { verifyTypedData as thirdwebVerifyTypedData } from "thirdweb";
import { verifySignature as thirdwebVerifySignature } from "thirdweb/auth";
import { isTestnet } from "./chain";

/**
 * Thirdweb client for server-side operations.
 * Used for signature verification that supports both EOAs and smart contract wallets.
 */
export const thirdwebClient = createThirdwebClient({
  secretKey: process.env.SECRET_KEY!,
});

/**
 * The chain to use for verification
 */
export const verificationChain = isTestnet ? baseSepolia : base;

/**
 * Verify EIP-712 typed data signature.
 * Supports both EOA and smart contract wallet signatures (ERC-1271).
 */
export async function verifyTypedDataSignature({
  address,
  signature,
  domain,
  types,
  primaryType,
  message,
}: {
  address: `0x${string}`;
  signature: `0x${string}`;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract?: `0x${string}`;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  types: any;
  primaryType: string;
  message: Record<string, unknown>;
}): Promise<boolean> {
  return thirdwebVerifyTypedData({
    address,
    signature,
    client: thirdwebClient,
    chain: verificationChain,
    domain,
    types,
    primaryType,
    message,
  });
}

/**
 * Verify a plain message signature.
 * Supports both EOA and smart contract wallet signatures (ERC-1271).
 */
export async function verifyMessageSignature({
  address,
  message,
  signature,
}: {
  address: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}): Promise<boolean> {
  return thirdwebVerifySignature({
    address,
    message,
    signature,
    client: thirdwebClient,
    chain: verificationChain,
  });
}


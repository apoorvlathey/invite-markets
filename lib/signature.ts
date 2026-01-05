// EIP-712 Domain and Types for Listing Operations

export const getEIP712Domain = (chainId: number) =>
  ({
    name: "Invite Markets",
    version: "1",
    chainId,
  } as const);

export const EIP712_TYPES = {
  CreateListing: [
    { name: "inviteUrl", type: "string" },
    { name: "priceUsdc", type: "string" },
    { name: "sellerAddress", type: "address" },
    { name: "appId", type: "string" },
    { name: "appName", type: "string" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const EIP712_UPDATE_TYPES = {
  UpdateListing: [
    { name: "slug", type: "string" },
    { name: "inviteUrl", type: "string" },
    { name: "priceUsdc", type: "string" },
    { name: "sellerAddress", type: "address" },
    { name: "appName", type: "string" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const EIP712_DELETE_TYPES = {
  DeleteListing: [
    { name: "slug", type: "string" },
    { name: "sellerAddress", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export interface ListingMessage {
  inviteUrl: string;
  priceUsdc: string;
  sellerAddress: `0x${string}`;
  appId: string;
  appName: string;
  nonce: bigint;
}

export interface UpdateListingMessage {
  slug: string;
  inviteUrl: string;
  priceUsdc: string;
  sellerAddress: `0x${string}`;
  appName: string;
  nonce: bigint;
}

export interface DeleteListingMessage {
  slug: string;
  sellerAddress: `0x${string}`;
  nonce: bigint;
}

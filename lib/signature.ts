// EIP-712 Domain and Types for Listing Operations

export type ListingType = "invite_link" | "access_code";

export const getEIP712Domain = (chainId: number) =>
  ({
    name: "Invite Markets",
    version: "1",
    chainId,
  } as const);

export const EIP712_TYPES = {
  CreateListing: [
    { name: "listingType", type: "string" },
    { name: "inviteUrl", type: "string" },
    { name: "appUrl", type: "string" },
    { name: "accessCode", type: "string" },
    { name: "priceUsdc", type: "string" },
    { name: "sellerAddress", type: "address" },
    { name: "appId", type: "string" },
    { name: "appName", type: "string" },
    { name: "maxUses", type: "string" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const EIP712_UPDATE_TYPES = {
  UpdateListing: [
    { name: "slug", type: "string" },
    { name: "listingType", type: "string" },
    { name: "inviteUrl", type: "string" },
    { name: "appUrl", type: "string" },
    { name: "accessCode", type: "string" },
    { name: "priceUsdc", type: "string" },
    { name: "sellerAddress", type: "address" },
    { name: "appName", type: "string" },
    { name: "maxUses", type: "string" },
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
  listingType: ListingType;
  inviteUrl: string; // Used for invite_link type
  appUrl: string; // Used for access_code type
  accessCode: string; // Used for access_code type
  priceUsdc: string;
  sellerAddress: `0x${string}`;
  appId: string;
  appName: string;
  maxUses: string; // Maximum number of uses (-1 for unlimited)
  nonce: bigint;
}

export interface UpdateListingMessage {
  slug: string;
  listingType: ListingType;
  inviteUrl: string; // Used for invite_link type
  appUrl: string; // Used for access_code type
  accessCode: string; // Used for access_code type
  priceUsdc: string;
  sellerAddress: `0x${string}`;
  appName: string;
  maxUses: string; // Maximum number of uses (-1 for unlimited)
  nonce: bigint;
}

export interface DeleteListingMessage {
  slug: string;
  sellerAddress: `0x${string}`;
  nonce: bigint;
}

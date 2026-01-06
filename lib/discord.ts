/**
 * Discord Webhook Notifications
 *
 * SECURITY NOTE: This module intentionally uses typed interfaces that EXCLUDE
 * sensitive fields (inviteUrl, accessCode) to prevent accidental data leaks.
 * Only public information is sent to Discord.
 */

import { ListingType } from "@/models/listing";

// =============================================================================
// SAFE DATA TYPES - Explicitly exclude sensitive fields
// =============================================================================

/**
 * Safe listing data for Discord notifications.
 * NOTE: inviteUrl and accessCode are intentionally NOT included.
 */
export interface ListingNotificationData {
  slug: string;
  listingType: ListingType;
  appName?: string;
  appId?: string;
  appUrl?: string; // Only for access_code type (public)
  priceUsdc: number;
  sellerAddress: string;
  maxUses: number;
}

/**
 * Safe purchase data for Discord notifications.
 * NOTE: inviteUrl and accessCode are intentionally NOT included.
 */
export interface PurchaseNotificationData {
  slug: string;
  appName?: string;
  appId?: string;
  priceUsdc: number;
  sellerAddress: string;
  buyerAddress: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BASE_MAINNET_CHAIN_ID = 8453;
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Colors for Discord embeds (decimal format)
const COLORS = {
  GREEN: 0x00ff00, // New listing
  BLUE: 0x0099ff, // Purchase
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the Discord webhook URL based on chain ID.
 * Returns undefined if webhook is not configured.
 */
function getWebhookUrl(chainId: number): string | undefined {
  if (chainId === BASE_MAINNET_CHAIN_ID) {
    return process.env.DISCORD_WEBHOOK_MAINNET;
  }
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    return process.env.DISCORD_WEBHOOK_TESTNET;
  }
  return undefined;
}

/**
 * Truncates an Ethereum address for display.
 * 0x1234...5678
 */
function truncateAddress(address: string): string {
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Gets the display name for an app (prioritizes appName over appId).
 */
function getAppDisplayName(appName?: string, appId?: string): string {
  return appName || appId || "Unknown App";
}

/**
 * Formats the uses display string.
 */
function formatUses(maxUses: number): string {
  if (maxUses === -1) return "Unlimited";
  if (maxUses === 1) return "Single use";
  return `${maxUses} uses`;
}

/**
 * Gets the listing URL for the frontend.
 */
function getListingUrl(slug: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://invite.markets";
  return `${baseUrl}/listing/${slug}`;
}

/**
 * Gets the network name for display.
 */
function getNetworkName(chainId: number): string {
  if (chainId === BASE_MAINNET_CHAIN_ID) return "Base Mainnet";
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return "Base Sepolia";
  return `Chain ${chainId}`;
}

// =============================================================================
// DISCORD EMBED BUILDERS
// =============================================================================

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  url?: string;
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

/**
 * Builds a Discord embed for a new listing notification.
 */
function buildNewListingEmbed(
  data: ListingNotificationData,
  chainId: number
): DiscordEmbed {
  const appName = getAppDisplayName(data.appName, data.appId);
  const listingUrl = getListingUrl(data.slug);

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "💰 Price", value: `${data.priceUsdc} USDC`, inline: true },
    {
      name: "👤 Seller",
      value: truncateAddress(data.sellerAddress),
      inline: true,
    },
    {
      name: "📋 Type",
      value: data.listingType === "access_code" ? "Access Code" : "Invite Link",
      inline: true,
    },
    { name: "🔢 Uses", value: formatUses(data.maxUses), inline: true },
  ];

  return {
    title: `🆕 New Listing: ${appName}`,
    color: COLORS.GREEN,
    fields,
    url: listingUrl,
    footer: { text: getNetworkName(chainId) },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds a Discord embed for a purchase notification.
 */
function buildPurchaseEmbed(
  data: PurchaseNotificationData,
  chainId: number
): DiscordEmbed {
  const appName = getAppDisplayName(data.appName, data.appId);
  const listingUrl = getListingUrl(data.slug);

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "💰 Price", value: `${data.priceUsdc} USDC`, inline: true },
    {
      name: "🛒 Buyer",
      value: truncateAddress(data.buyerAddress),
      inline: true,
    },
    {
      name: "👤 Seller",
      value: truncateAddress(data.sellerAddress),
      inline: true,
    },
  ];

  return {
    title: `💸 Sale: ${appName}`,
    color: COLORS.BLUE,
    fields,
    url: listingUrl,
    footer: { text: getNetworkName(chainId) },
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Sends a new listing notification to Discord.
 * Fire-and-forget - errors are logged but don't throw.
 *
 * @param data - Safe listing data (sensitive fields excluded by type)
 * @param chainId - Chain ID to determine which channel to post to
 */
export async function sendNewListingNotification(
  data: ListingNotificationData,
  chainId: number
): Promise<void> {
  const webhookUrl = getWebhookUrl(chainId);

  if (!webhookUrl) {
    console.log(
      `[Discord] Webhook not configured for chainId ${chainId}, skipping notification`
    );
    return;
  }

  const payload: DiscordWebhookPayload = {
    embeds: [buildNewListingEmbed(data, chainId)],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[Discord] Failed to send new listing notification: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("[Discord] Error sending new listing notification:", error);
  }
}

/**
 * Sends a purchase notification to Discord.
 * Fire-and-forget - errors are logged but don't throw.
 *
 * @param data - Safe purchase data (sensitive fields excluded by type)
 * @param chainId - Chain ID to determine which channel to post to
 */
export async function sendPurchaseNotification(
  data: PurchaseNotificationData,
  chainId: number
): Promise<void> {
  const webhookUrl = getWebhookUrl(chainId);

  if (!webhookUrl) {
    console.log(
      `[Discord] Webhook not configured for chainId ${chainId}, skipping notification`
    );
    return;
  }

  const payload: DiscordWebhookPayload = {
    embeds: [buildPurchaseEmbed(data, chainId)],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[Discord] Failed to send purchase notification: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("[Discord] Error sending purchase notification:", error);
  }
}


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
// CONSTANTS (exported for backfill script)
// =============================================================================

export const BASE_MAINNET_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

// Colors for Discord embeds (decimal format)
export const DISCORD_COLORS = {
  GREEN: 0x00ff00, // New listing
  BLUE: 0x0099ff, // Purchase
};

// =============================================================================
// DISCORD EMBED TYPES (exported for backfill script)
// =============================================================================

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  url?: string;
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

// =============================================================================
// HELPER FUNCTIONS (exported for backfill script)
// =============================================================================

/**
 * Gets the Discord webhook URL based on chain ID.
 * Returns undefined if webhook is not configured.
 */
export function getWebhookUrl(chainId: number): string | undefined {
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
export function truncateAddress(address: string): string {
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Gets the display name for an app (prioritizes appName over appId).
 */
export function getAppDisplayName(appName?: string, appId?: string): string {
  return appName || appId || "Unknown App";
}

/**
 * Formats the uses display string.
 */
export function formatUses(maxUses: number): string {
  if (maxUses === -1) return "Unlimited";
  if (maxUses === 1) return "Single use";
  return `${maxUses} uses`;
}

/**
 * Gets the listing URL for the frontend.
 */
export function getListingUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invite.markets";
  return `${baseUrl}/listing/${slug}`;
}

/**
 * Gets the network name for display.
 */
export function getNetworkName(chainId: number): string {
  if (chainId === BASE_MAINNET_CHAIN_ID) return "Base Mainnet";
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return "Base Sepolia";
  return `Chain ${chainId}`;
}

// =============================================================================
// DISCORD EMBED BUILDERS (exported for backfill script)
// =============================================================================

/**
 * Builds a Discord embed for a new listing notification.
 */
export function buildNewListingEmbed(
  data: ListingNotificationData,
  chainId: number,
  timestamp?: Date
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
    color: DISCORD_COLORS.GREEN,
    fields,
    url: listingUrl,
    footer: { text: getNetworkName(chainId) },
    timestamp: (timestamp || new Date()).toISOString(),
  };
}

/**
 * Builds a Discord embed for a purchase notification.
 */
export function buildPurchaseEmbed(
  data: PurchaseNotificationData,
  chainId: number,
  timestamp?: Date
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
    color: DISCORD_COLORS.BLUE,
    fields,
    url: listingUrl,
    footer: { text: getNetworkName(chainId) },
    timestamp: (timestamp || new Date()).toISOString(),
  };
}

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Default configuration for Discord webhook requests.
 */
const DISCORD_CONFIG = {
  /** Maximum number of retry attempts for rate-limited requests */
  maxRetries: 3,
  /** Default wait time in ms if Retry-After header is missing */
  defaultRetryDelayMs: 2000,
  /** Maximum wait time in ms to prevent excessive delays */
  maxRetryDelayMs: 30000,
};

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse the Retry-After header from Discord's response.
 * Returns delay in milliseconds, or null if header is missing/invalid.
 */
function parseRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return null;

  // Retry-After can be seconds (integer) or a date string
  const seconds = parseFloat(retryAfter);
  if (!isNaN(seconds)) {
    return Math.min(seconds * 1000, DISCORD_CONFIG.maxRetryDelayMs);
  }

  // Try parsing as date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    return Math.min(Math.max(delayMs, 0), DISCORD_CONFIG.maxRetryDelayMs);
  }

  return null;
}

// =============================================================================
// PUBLIC API
// =============================================================================

export interface SendDiscordEmbedOptions {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Skip retry logic entirely (useful for backfill script which handles delays itself) */
  skipRetry?: boolean;
}

/**
 * Sends a Discord embed to the appropriate webhook.
 * Automatically handles rate limiting (429 errors) with retry logic.
 * Fire-and-forget - errors are logged but don't throw.
 *
 * @param embed - The Discord embed to send
 * @param chainId - Chain ID to determine which webhook to use
 * @param options - Optional configuration for retry behavior
 */
export async function sendDiscordEmbed(
  embed: DiscordEmbed,
  chainId: number,
  options: SendDiscordEmbedOptions = {}
): Promise<boolean> {
  const webhookUrl = getWebhookUrl(chainId);
  const maxRetries = options.maxRetries ?? DISCORD_CONFIG.maxRetries;
  const skipRetry = options.skipRetry ?? false;

  if (!webhookUrl) {
    console.log(
      `[Discord] Webhook not configured for chainId ${chainId}, skipping notification`
    );
    return false;
  }

  const payload: DiscordWebhookPayload = {
    embeds: [embed],
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Success
      if (response.ok) {
        return true;
      }

      // Rate limited - retry with backoff
      if (response.status === 429 && !skipRetry && attempt < maxRetries) {
        const retryAfterMs =
          parseRetryAfter(response) ?? DISCORD_CONFIG.defaultRetryDelayMs;

        console.warn(
          `[Discord] Rate limited (429). Retrying in ${retryAfterMs}ms (attempt ${
            attempt + 1
          }/${maxRetries})`
        );

        await sleep(retryAfterMs);
        continue;
      }

      // Other error
      console.error(
        `[Discord] Failed to send notification: ${response.status} ${response.statusText}`
      );
      return false;
    } catch (error) {
      lastError = error as Error;

      // Network error - retry with exponential backoff
      if (!skipRetry && attempt < maxRetries) {
        const backoffMs = Math.min(
          DISCORD_CONFIG.defaultRetryDelayMs * Math.pow(2, attempt),
          DISCORD_CONFIG.maxRetryDelayMs
        );

        console.warn(
          `[Discord] Network error. Retrying in ${backoffMs}ms (attempt ${
            attempt + 1
          }/${maxRetries}): ${lastError.message}`
        );

        await sleep(backoffMs);
        continue;
      }
    }
  }

  console.error(
    "[Discord] Error sending notification after retries:",
    lastError
  );
  return false;
}

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
  const embed = buildNewListingEmbed(data, chainId);
  await sendDiscordEmbed(embed, chainId);
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
  const embed = buildPurchaseEmbed(data, chainId);
  await sendDiscordEmbed(embed, chainId);
}

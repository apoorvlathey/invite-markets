/**
 * Discord Backfill Script
 *
 * Sends Discord notifications for existing listings and purchases.
 * Run with: pnpm backfill:discord [options]
 *
 * Options:
 *   --listings-only    Only backfill listings
 *   --purchases-only   Only backfill purchases
 *   --chain <id>       Only backfill for specific chain (8453 or 84532)
 *   --since <date>     Only backfill items created after this date (ISO format)
 *   --dry-run          Preview what would be sent without actually sending
 *   --delay <ms>       Delay between notifications (default: 1000ms)
 *
 * Examples:
 *   pnpm backfill:discord
 *   pnpm backfill:discord -- --dry-run
 *   pnpm backfill:discord -- --listings-only --chain 8453
 *   pnpm backfill:discord -- --since 2024-01-01
 */

import "dotenv/config";
import mongoose from "mongoose";
import { Listing } from "../models/listing";
import { Transaction } from "../models/transaction";
import {
  getWebhookUrl,
  buildNewListingEmbed,
  buildPurchaseEmbed,
  type DiscordEmbed,
} from "../lib/discord";

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

interface Options {
  listingsOnly: boolean;
  purchasesOnly: boolean;
  chainId: number | null;
  since: Date | null;
  dryRun: boolean;
  delay: number;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    listingsOnly: false,
    purchasesOnly: false,
    chainId: null,
    since: null,
    dryRun: false,
    delay: 1000,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--listings-only":
        options.listingsOnly = true;
        break;
      case "--purchases-only":
        options.purchasesOnly = true;
        break;
      case "--chain":
        options.chainId = parseInt(args[++i], 10);
        break;
      case "--since":
        options.since = new Date(args[++i]);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--delay":
        options.delay = parseInt(args[++i], 10);
        break;
      case "--help":
        console.log(`
Discord Backfill Script

Usage: pnpm backfill:discord [options]

Options:
  --listings-only    Only backfill listings
  --purchases-only   Only backfill purchases
  --chain <id>       Only backfill for specific chain (8453 or 84532)
  --since <date>     Only backfill items created after this date (ISO format)
  --dry-run          Preview what would be sent without actually sending
  --delay <ms>       Delay between notifications (default: 1000ms)
  --help             Show this help message

Examples:
  pnpm backfill:discord
  pnpm backfill:discord -- --dry-run
  pnpm backfill:discord -- --listings-only --chain 8453
  pnpm backfill:discord -- --since 2024-01-01
        `);
        process.exit(0);
    }
  }

  return options;
}

// =============================================================================
// HELPERS
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// DISCORD API (with rate limit handling)
// =============================================================================

const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 30000;

/**
 * Parse the Retry-After header from Discord's response.
 */
function parseRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return null;

  const seconds = parseFloat(retryAfter);
  if (!isNaN(seconds)) {
    return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  }

  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    return Math.min(Math.max(delayMs, 0), MAX_RETRY_DELAY_MS);
  }

  return null;
}

async function sendDiscordEmbed(
  webhookUrl: string,
  embed: DiscordEmbed,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would send: ${embed.title}`);
    return true;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (response.ok) {
        console.log(`  ✅ Sent: ${embed.title}`);
        return true;
      }

      // Rate limited - retry with backoff
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfterMs =
          parseRetryAfter(response) ?? DEFAULT_RETRY_DELAY_MS;
        console.warn(
          `  ⏳ Rate limited. Waiting ${retryAfterMs}ms (retry ${
            attempt + 1
          }/${MAX_RETRIES})`
        );
        await sleep(retryAfterMs);
        continue;
      }

      console.error(`  ❌ Failed: ${response.status} ${response.statusText}`);
      return false;
    } catch (error) {
      lastError = error as Error;

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.min(
          DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt),
          MAX_RETRY_DELAY_MS
        );
        console.warn(
          `  ⏳ Network error. Retrying in ${backoffMs}ms (retry ${
            attempt + 1
          }/${MAX_RETRIES})`
        );
        await sleep(backoffMs);
        continue;
      }
    }
  }

  console.error(`  ❌ Error after retries:`, lastError);
  return false;
}

// =============================================================================
// BACKFILL FUNCTIONS
// =============================================================================

async function backfillListings(options: Options): Promise<number> {
  console.log("\n📋 Backfilling Listings...\n");

  // Build query
  const query: Record<string, unknown> = {};
  if (options.chainId) {
    query.chainId = options.chainId;
  }
  if (options.since) {
    query.createdAt = { $gte: options.since };
  }

  const listings = await Listing.find(query).sort({ createdAt: 1 }).lean();

  console.log(`Found ${listings.length} listings to backfill\n`);

  let sent = 0;
  for (const listing of listings) {
    const webhookUrl = getWebhookUrl(listing.chainId);
    if (!webhookUrl) {
      console.log(
        `  ⏭️  Skipping ${listing.slug}: No webhook for chain ${listing.chainId}`
      );
      continue;
    }

    const embed = buildNewListingEmbed(
      {
        slug: listing.slug,
        listingType: listing.listingType || "invite_link",
        appName: listing.appName,
        appId: listing.appId,
        appUrl:
          listing.listingType === "access_code" ? listing.appUrl : undefined,
        priceUsdc: listing.priceUsdc,
        sellerAddress: listing.sellerAddress,
        maxUses: listing.maxUses ?? 1,
      },
      listing.chainId,
      listing.createdAt
    );

    const success = await sendDiscordEmbed(webhookUrl, embed, options.dryRun);
    if (success) sent++;

    if (!options.dryRun && options.delay > 0) {
      await sleep(options.delay);
    }
  }

  return sent;
}

async function backfillPurchases(options: Options): Promise<number> {
  console.log("\n🛒 Backfilling Purchases...\n");

  // Build query
  const query: Record<string, unknown> = {};
  if (options.chainId) {
    query.chainId = options.chainId;
  }
  if (options.since) {
    query.createdAt = { $gte: options.since };
  }

  const transactions = await Transaction.find(query)
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Found ${transactions.length} purchases to backfill\n`);

  // Pre-fetch all related listings for appName lookup
  const listingSlugs = [...new Set(transactions.map((t) => t.listingSlug))];
  const listings = await Listing.find({ slug: { $in: listingSlugs } }).lean();
  const listingMap = new Map(listings.map((l) => [l.slug, l]));

  let sent = 0;
  for (const transaction of transactions) {
    const webhookUrl = getWebhookUrl(transaction.chainId);
    if (!webhookUrl) {
      console.log(
        `  ⏭️  Skipping purchase: No webhook for chain ${transaction.chainId}`
      );
      continue;
    }

    const listing = listingMap.get(transaction.listingSlug);
    const embed = buildPurchaseEmbed(
      {
        slug: transaction.listingSlug,
        appName: listing?.appName,
        appId: transaction.appId,
        priceUsdc: transaction.priceUsdc,
        sellerAddress: transaction.sellerAddress,
        buyerAddress: transaction.buyerAddress,
      },
      transaction.chainId,
      transaction.createdAt
    );

    const success = await sendDiscordEmbed(webhookUrl, embed, options.dryRun);
    if (success) sent++;

    if (!options.dryRun && options.delay > 0) {
      await sleep(options.delay);
    }
  }

  return sent;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const options = parseArgs();

  console.log("🚀 Discord Backfill Script\n");
  console.log("Options:");
  console.log(`  - Listings: ${options.purchasesOnly ? "❌" : "✅"}`);
  console.log(`  - Purchases: ${options.listingsOnly ? "❌" : "✅"}`);
  console.log(`  - Chain: ${options.chainId || "All"}`);
  console.log(`  - Since: ${options.since?.toISOString() || "All time"}`);
  console.log(`  - Dry run: ${options.dryRun ? "✅" : "❌"}`);
  console.log(`  - Delay: ${options.delay}ms`);

  // Check webhook configuration
  const mainnetWebhook = process.env.DISCORD_WEBHOOK_MAINNET;
  const testnetWebhook = process.env.DISCORD_WEBHOOK_TESTNET;

  console.log("\nWebhook Status:");
  console.log(
    `  - Mainnet: ${mainnetWebhook ? "✅ Configured" : "❌ Not set"}`
  );
  console.log(
    `  - Testnet: ${testnetWebhook ? "✅ Configured" : "❌ Not set"}`
  );

  if (!mainnetWebhook && !testnetWebhook) {
    console.error(
      "\n❌ No webhooks configured! Set DISCORD_WEBHOOK_MAINNET and/or DISCORD_WEBHOOK_TESTNET"
    );
    process.exit(1);
  }

  // Connect to MongoDB
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    console.error("\n❌ MONGODB_URL not set!");
    process.exit(1);
  }

  console.log("\n📡 Connecting to MongoDB...");
  await mongoose.connect(mongoUrl);
  console.log("✅ Connected!\n");

  let listingsSent = 0;
  let purchasesSent = 0;

  try {
    // Backfill listings
    if (!options.purchasesOnly) {
      listingsSent = await backfillListings(options);
    }

    // Backfill purchases
    if (!options.listingsOnly) {
      purchasesSent = await backfillPurchases(options);
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Summary:");
    console.log(`  - Listings sent: ${listingsSent}`);
    console.log(`  - Purchases sent: ${purchasesSent}`);
    console.log(`  - Total: ${listingsSent + purchasesSent}`);
    if (options.dryRun) {
      console.log(
        "\n⚠️  This was a dry run. No notifications were actually sent."
      );
    }
    console.log("=".repeat(50) + "\n");
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

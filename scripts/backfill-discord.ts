/**
 * Discord Backfill Script
 *
 * Sends Discord notifications for existing listings and purchases.
 * Run with: npx tsx scripts/backfill-discord.ts [options]
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
 *   npx tsx scripts/backfill-discord.ts
 *   npx tsx scripts/backfill-discord.ts --dry-run
 *   npx tsx scripts/backfill-discord.ts --listings-only --chain 8453
 *   npx tsx scripts/backfill-discord.ts --since 2024-01-01
 */

import "dotenv/config";
import mongoose from "mongoose";
import { Listing, type IListing } from "../models/listing";
import { Transaction, type ITransaction } from "../models/transaction";

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_MAINNET_CHAIN_ID = 8453;
const BASE_SEPOLIA_CHAIN_ID = 84532;

const COLORS = {
  GREEN: 0x00ff00,
  BLUE: 0x0099ff,
};

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

Usage: npx tsx scripts/backfill-discord.ts [options]

Options:
  --listings-only    Only backfill listings
  --purchases-only   Only backfill purchases
  --chain <id>       Only backfill for specific chain (8453 or 84532)
  --since <date>     Only backfill items created after this date (ISO format)
  --dry-run          Preview what would be sent without actually sending
  --delay <ms>       Delay between notifications (default: 1000ms)
  --help             Show this help message

Examples:
  npx tsx scripts/backfill-discord.ts
  npx tsx scripts/backfill-discord.ts --dry-run
  npx tsx scripts/backfill-discord.ts --listings-only --chain 8453
  npx tsx scripts/backfill-discord.ts --since 2024-01-01
        `);
        process.exit(0);
    }
  }

  return options;
}

// =============================================================================
// HELPERS
// =============================================================================

function getWebhookUrl(chainId: number): string | undefined {
  if (chainId === BASE_MAINNET_CHAIN_ID) {
    return process.env.DISCORD_WEBHOOK_MAINNET;
  }
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    return process.env.DISCORD_WEBHOOK_TESTNET;
  }
  return undefined;
}

function truncateAddress(address: string): string {
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getAppDisplayName(appName?: string, appId?: string): string {
  return appName || appId || "Unknown App";
}

function formatUses(maxUses: number): string {
  if (maxUses === -1) return "Unlimited";
  if (maxUses === 1) return "Single use";
  return `${maxUses} uses`;
}

function getListingUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invite.markets";
  return `${baseUrl}/listing/${slug}`;
}

function getNetworkName(chainId: number): string {
  if (chainId === BASE_MAINNET_CHAIN_ID) return "Base Mainnet";
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return "Base Sepolia";
  return `Chain ${chainId}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// DISCORD API
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

async function sendDiscordEmbed(
  webhookUrl: string,
  embed: DiscordEmbed,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would send: ${embed.title}`);
    return true;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      console.error(`  ❌ Failed: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`  ✅ Sent: ${embed.title}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error:`, error);
    return false;
  }
}

// =============================================================================
// BACKFILL FUNCTIONS
// =============================================================================

function buildListingEmbed(listing: IListing): DiscordEmbed {
  const appName = getAppDisplayName(listing.appName, listing.appId);
  const listingUrl = getListingUrl(listing.slug);

  return {
    title: `🆕 New Listing: ${appName}`,
    color: COLORS.GREEN,
    fields: [
      { name: "💰 Price", value: `${listing.priceUsdc} USDC`, inline: true },
      {
        name: "👤 Seller",
        value: truncateAddress(listing.sellerAddress),
        inline: true,
      },
      {
        name: "📋 Type",
        value:
          listing.listingType === "access_code" ? "Access Code" : "Invite Link",
        inline: true,
      },
      {
        name: "🔢 Uses",
        value: formatUses(listing.maxUses ?? 1),
        inline: true,
      },
    ],
    url: listingUrl,
    footer: { text: getNetworkName(listing.chainId) },
    timestamp: listing.createdAt.toISOString(),
  };
}

function buildPurchaseEmbed(
  transaction: ITransaction,
  listing: IListing | null
): DiscordEmbed {
  const appName = getAppDisplayName(listing?.appName, transaction.appId);
  const listingUrl = getListingUrl(transaction.listingSlug);

  return {
    title: `💸 Sale: ${appName}`,
    color: COLORS.BLUE,
    fields: [
      {
        name: "💰 Price",
        value: `${transaction.priceUsdc} USDC`,
        inline: true,
      },
      {
        name: "🛒 Buyer",
        value: truncateAddress(transaction.buyerAddress),
        inline: true,
      },
      {
        name: "👤 Seller",
        value: truncateAddress(transaction.sellerAddress),
        inline: true,
      },
    ],
    url: listingUrl,
    footer: { text: getNetworkName(transaction.chainId) },
    timestamp: transaction.createdAt.toISOString(),
  };
}

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

    const embed = buildListingEmbed(listing);
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

  // Pre-fetch all related listings
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

    const listing = listingMap.get(transaction.listingSlug) || null;
    const embed = buildPurchaseEmbed(transaction, listing);
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

/**
 * Discord Backfill Script
 *
 * Sends Discord notifications for existing listings and purchases.
 * Run with: pnpm backfill:discord [options]
 *
 * Options:
 *   --test             Test mode: send only 1 latest listing + 1 latest purchase
 *   --listings-only    Only backfill listings
 *   --purchases-only   Only backfill purchases
 *   --chain <id>       Only backfill for specific chain (8453 or 84532)
 *   --since <date>     Only backfill items created after this date (ISO format)
 *   --dry-run          Preview what would be sent without actually sending
 *   --delay <ms>       Delay between notifications (default: 1000ms)
 *
 * Examples:
 *   pnpm backfill:discord
 *   pnpm backfill:discord -- --test
 *   pnpm backfill:discord -- --dry-run
 *   pnpm backfill:discord -- --listings-only --chain 8453
 *   pnpm backfill:discord -- --since 2024-01-01
 */

import dotenv from "dotenv";
import path from "path";

// Load .env.local file (not auto-loaded by dotenv/config)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import mongoose from "mongoose";
import { Listing } from "../models/listing";
import { Transaction } from "../models/transaction";
import { ResolvedAddress } from "../models/resolvedAddress";
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
  test: boolean;
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
    test: false,
    listingsOnly: false,
    purchasesOnly: false,
    chainId: null,
    since: null,
    dryRun: false,
    delay: 1000,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--test":
        options.test = true;
        break;
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
  --test             Test mode: send only 1 latest listing + 1 latest purchase
  --listings-only    Only backfill listings
  --purchases-only   Only backfill purchases
  --chain <id>       Only backfill for specific chain (8453 or 84532)
  --since <date>     Only backfill items created after this date (ISO format)
  --dry-run          Preview what would be sent without actually sending
  --delay <ms>       Delay between notifications (default: 1000ms)
  --help             Show this help message

Examples:
  pnpm backfill:discord
  pnpm backfill:discord -- --test
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

// Cache expiry for resolved addresses (2 days, matching the API)
const CACHE_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Batch resolve addresses from the cache.
 * Returns a map of address -> display name (or undefined if not resolved).
 */
async function resolveAddresses(
  addresses: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (addresses.length === 0) return result;

  const uniqueAddresses = [...new Set(addresses.map((a) => a.toLowerCase()))];
  const cacheExpiryDate = new Date(Date.now() - CACHE_EXPIRY_MS);

  try {
    const resolved = await ResolvedAddress.find({
      address: { $in: uniqueAddresses },
      resolvedAt: { $gte: cacheExpiryDate },
    }).lean();

    for (const entry of resolved) {
      // Format with @ prefix for Farcaster
      const displayName =
        entry.resolvedType === "farcaster"
          ? `@${entry.displayName}`
          : entry.displayName;
      result.set(entry.address, displayName);
    }
  } catch (error) {
    console.warn("  ⚠️  Failed to resolve addresses:", error);
  }

  return result;
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
// TYPES FOR UNIFIED PROCESSING
// =============================================================================

type ListingType = "invite_link" | "access_code";

interface ListingEvent {
  type: "listing";
  createdAt: Date;
  data: {
    slug: string;
    listingType: ListingType;
    appName?: string;
    appId?: string;
    appUrl?: string;
    priceUsdc: number;
    sellerAddress: string;
    maxUses: number;
    chainId: number;
  };
}

interface PurchaseEvent {
  type: "purchase";
  createdAt: Date;
  data: {
    listingSlug: string;
    appName?: string;
    appId?: string;
    priceUsdc: number;
    sellerAddress: string;
    buyerAddress: string;
    chainId: number;
  };
}

type BackfillEvent = ListingEvent | PurchaseEvent;

// =============================================================================
// BACKFILL FUNCTIONS
// =============================================================================

async function fetchListings(
  options: Options,
  limit?: number
): Promise<ListingEvent[]> {
  // Build query
  const query: Record<string, unknown> = {};
  if (options.chainId) {
    query.chainId = options.chainId;
  }
  if (options.since) {
    query.createdAt = { $gte: options.since };
  }

  // SECURITY: Explicitly exclude sensitive fields (inviteUrl, accessCode) at DB level
  // Sort descending when limit is set (to get latest), ascending otherwise (chronological)
  let queryBuilder = Listing.find(query)
    .select("-inviteUrl -accessCode")
    .sort({ createdAt: limit ? -1 : 1 });

  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }

  const listings = await queryBuilder.lean();

  return listings.map((listing) => ({
    type: "listing" as const,
    createdAt: listing.createdAt,
    data: {
      slug: listing.slug,
      listingType: (listing.listingType || "invite_link") as ListingType,
      appName: listing.appName,
      appId: listing.appId,
      appUrl:
        listing.listingType === "access_code" ? listing.appUrl : undefined,
      priceUsdc: listing.priceUsdc,
      sellerAddress: listing.sellerAddress,
      maxUses: listing.maxUses ?? 1,
      chainId: listing.chainId,
    },
  }));
}

async function fetchPurchases(
  options: Options,
  limit?: number
): Promise<{
  events: PurchaseEvent[];
  listingMap: Map<string, { appName?: string }>;
}> {
  // Build query
  const query: Record<string, unknown> = {};
  if (options.chainId) {
    query.chainId = options.chainId;
  }
  if (options.since) {
    query.createdAt = { $gte: options.since };
  }

  // Sort descending when limit is set (to get latest), ascending otherwise (chronological)
  let queryBuilder = Transaction.find(query).sort({
    createdAt: limit ? -1 : 1,
  });

  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }

  const transactions = await queryBuilder.lean();

  // Pre-fetch all related listings for appName lookup
  // SECURITY: Only select fields needed for display (exclude inviteUrl, accessCode)
  const listingSlugs = [...new Set(transactions.map((t) => t.listingSlug))];
  const listings = await Listing.find({ slug: { $in: listingSlugs } })
    .select("slug appName")
    .lean();
  const listingMap = new Map(
    listings.map((l) => [l.slug, { appName: l.appName }])
  );

  const events: PurchaseEvent[] = transactions.map((transaction) => ({
    type: "purchase" as const,
    createdAt: transaction.createdAt,
    data: {
      listingSlug: transaction.listingSlug,
      appName: listingMap.get(transaction.listingSlug)?.appName,
      appId: transaction.appId,
      priceUsdc: transaction.priceUsdc,
      sellerAddress: transaction.sellerAddress,
      buyerAddress: transaction.buyerAddress,
      chainId: transaction.chainId,
    },
  }));

  return { events, listingMap };
}

async function backfillChronological(
  options: Options,
  limit?: number
): Promise<{ listingsSent: number; purchasesSent: number }> {
  console.log(
    limit
      ? `\n📋 Testing with ${limit} latest listing(s) + ${limit} latest purchase(s)...\n`
      : "\n📋 Backfilling in chronological order...\n"
  );

  // Fetch data based on options
  const listingEvents = options.purchasesOnly
    ? []
    : await fetchListings(options, limit);
  const { events: purchaseEvents } = options.listingsOnly
    ? { events: [] }
    : await fetchPurchases(options, limit);

  console.log(
    `Found ${listingEvents.length} listing(s) and ${purchaseEvents.length} purchase(s)`
  );

  // Combine and sort chronologically
  const allEvents: BackfillEvent[] = [...listingEvents, ...purchaseEvents];
  allEvents.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  console.log(`Processing ${allEvents.length} event(s) in chronological order`);

  // Pre-resolve all addresses
  const allAddresses = allEvents.flatMap((event) => {
    if (event.type === "listing") {
      return [event.data.sellerAddress];
    } else {
      return [event.data.sellerAddress, event.data.buyerAddress];
    }
  });
  console.log(`Resolving ${new Set(allAddresses).size} unique addresses...`);
  const resolvedNames = await resolveAddresses(allAddresses);
  console.log(`Resolved ${resolvedNames.size} addresses\n`);

  let listingsSent = 0;
  let purchasesSent = 0;

  for (const event of allEvents) {
    const chainId =
      event.type === "listing" ? event.data.chainId : event.data.chainId;
    const webhookUrl = getWebhookUrl(chainId);

    if (!webhookUrl) {
      const identifier =
        event.type === "listing" ? event.data.slug : event.data.listingSlug;
      console.log(
        `  ⏭️  Skipping ${event.type} ${identifier}: No webhook for chain ${chainId}`
      );
      continue;
    }

    let embed: DiscordEmbed;

    if (event.type === "listing") {
      embed = buildNewListingEmbed(
        {
          slug: event.data.slug,
          listingType: event.data.listingType,
          appName: event.data.appName,
          appId: event.data.appId,
          appUrl: event.data.appUrl,
          priceUsdc: event.data.priceUsdc,
          sellerAddress: event.data.sellerAddress,
          maxUses: event.data.maxUses,
          sellerDisplayName: resolvedNames.get(
            event.data.sellerAddress.toLowerCase()
          ),
        },
        event.data.chainId,
        event.createdAt
      );
    } else {
      embed = buildPurchaseEmbed(
        {
          slug: event.data.listingSlug,
          appName: event.data.appName,
          appId: event.data.appId,
          priceUsdc: event.data.priceUsdc,
          sellerAddress: event.data.sellerAddress,
          buyerAddress: event.data.buyerAddress,
          sellerDisplayName: resolvedNames.get(
            event.data.sellerAddress.toLowerCase()
          ),
          buyerDisplayName: resolvedNames.get(
            event.data.buyerAddress.toLowerCase()
          ),
        },
        event.data.chainId,
        event.createdAt
      );
    }

    const success = await sendDiscordEmbed(webhookUrl, embed, options.dryRun);
    if (success) {
      if (event.type === "listing") {
        listingsSent++;
      } else {
        purchasesSent++;
      }
    }

    if (!options.dryRun && options.delay > 0) {
      await sleep(options.delay);
    }
  }

  return { listingsSent, purchasesSent };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const options = parseArgs();

  console.log("🚀 Discord Backfill Script\n");

  if (options.test) {
    console.log(
      "🧪 TEST MODE: Only sending 1 latest listing + 1 latest purchase\n"
    );
  }

  console.log("Options:");
  console.log(`  - Test mode: ${options.test ? "✅" : "❌"}`);
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
  await mongoose.connect(mongoUrl, { dbName: "InviteMarkets" });
  console.log("✅ Connected!\n");

  // In test mode, only process 1 of each
  const limit = options.test ? 1 : undefined;

  try {
    // Backfill in chronological order
    const { listingsSent, purchasesSent } = await backfillChronological(
      options,
      limit
    );

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

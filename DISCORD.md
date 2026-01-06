# Discord Webhook Notifications

This document covers the Discord webhook notification system for Invite Markets.

## Overview

The system sends real-time notifications to Discord channels when:

1. **New Listing** - When a seller creates a new listing
2. **Purchase/Sale** - When a buyer successfully purchases a listing

Notifications are sent to different channels based on the chain:

| Chain ID | Network      | Discord Channel         |
| -------- | ------------ | ----------------------- |
| 8453     | Base Mainnet | `#base-mainnet`         |
| 84532    | Base Sepolia | `#base-sepolia-testnet` |

## Security

**IMPORTANT**: The notification system is designed to prevent leaking sensitive data.

| Field           | Visibility | Sent to Discord |
| --------------- | ---------- | --------------- |
| `inviteUrl`     | PRIVATE    | ❌ Never        |
| `accessCode`    | PRIVATE    | ❌ Never        |
| `appUrl`        | PUBLIC     | ✅ Safe         |
| `priceUsdc`     | PUBLIC     | ✅ Safe         |
| `sellerAddress` | PUBLIC     | ✅ Safe         |
| `buyerAddress`  | PUBLIC     | ✅ Safe         |
| `appName/appId` | PUBLIC     | ✅ Safe         |
| `slug`          | PUBLIC     | ✅ Safe         |

The TypeScript interfaces in `lib/discord.ts` explicitly exclude sensitive fields, making it impossible to accidentally pass them.

## Setup

### Step 1: Create Discord Channels

In your Discord server, create two text channels:

- `#base-mainnet` - For production notifications
- `#base-sepolia-testnet` - For testnet notifications

### Step 2: Create Webhooks

For each channel:

1. Right-click the channel → **Edit Channel**
2. Go to **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Set the name (e.g., "Invite Markets")
5. Optionally upload an avatar
6. Click **Copy Webhook URL**

### Step 3: Configure Environment Variables

Add the webhook URLs to your `.env.local`:

```env
DISCORD_WEBHOOK_MAINNET=https://discord.com/api/webhooks/YOUR_MAINNET_ID/YOUR_MAINNET_TOKEN
DISCORD_WEBHOOK_TESTNET=https://discord.com/api/webhooks/YOUR_TESTNET_ID/YOUR_TESTNET_TOKEN
```

### Step 4: Test (Optional)

Test your webhook with curl:

```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from Invite Markets! 🎉"}'
```

## Notification Format

### New Listing

```
┌─────────────────────────────────────┐
│ 🆕 New Listing: [App Name]          │
├─────────────────────────────────────┤
│ 💰 Price      │ 👤 Seller           │
│ 10 USDC       │ 0x1234...5678       │
├─────────────────────────────────────┤
│ 📋 Type       │ 🔢 Uses             │
│ Invite Link   │ Single use          │
├─────────────────────────────────────┤
│ Base Mainnet            • Just now  │
└─────────────────────────────────────┘
```

### Purchase/Sale

```
┌─────────────────────────────────────┐
│ 💸 Sale: [App Name]                 │
├─────────────────────────────────────┤
│ 💰 Price      │ 🛒 Buyer            │
│ 10 USDC       │ 0xabcd...efgh       │
├─────────────────────────────────────┤
│ 👤 Seller                           │
│ 0x1234...5678                       │
├─────────────────────────────────────┤
│ Base Mainnet            • Just now  │
└─────────────────────────────────────┘
```

## Implementation Details

### Files

| File                               | Purpose                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| `lib/discord.ts`                   | Discord webhook utility with type-safe interfaces and shared helpers |
| `app/api/listings/route.ts`        | Sends notification on new listing creation                           |
| `app/api/purchase/[slug]/route.ts` | Sends notification on successful purchase                            |
| `scripts/backfill-discord.ts`      | Backfill script for historical data (imports from `lib/discord.ts`)  |

### Shared Utilities in `lib/discord.ts`

The following are exported and shared between the API routes and the backfill script:

- **Constants**: `BASE_MAINNET_CHAIN_ID`, `BASE_SEPOLIA_CHAIN_ID`, `DISCORD_COLORS`
- **Types**: `ListingNotificationData`, `PurchaseNotificationData`, `DiscordEmbed`, `DiscordWebhookPayload`
- **Helpers**: `getWebhookUrl()`, `truncateAddress()`, `getAppDisplayName()`, `formatUses()`, `getListingUrl()`, `getNetworkName()`
- **Embed Builders**: `buildNewListingEmbed()`, `buildPurchaseEmbed()`
- **Sender Functions**: `sendDiscordEmbed()`, `sendNewListingNotification()`, `sendPurchaseNotification()`

### How It Works

1. **Fire-and-forget**: Notifications are sent asynchronously and don't block API responses
2. **Error handling**: Errors are logged but don't fail the API request
3. **Chain routing**: `chainId` determines which webhook URL to use
4. **Type safety**: Interfaces explicitly exclude sensitive fields

### API Integration Points

**New Listing** (`app/api/listings/route.ts`):

```typescript
// After listing creation (line ~288)
sendNewListingNotification(
  {
    slug: listing.slug,
    listingType: listing.listingType || "invite_link",
    appName: listing.appName,
    appId: listing.appId,
    appUrl: listing.listingType === "access_code" ? listing.appUrl : undefined,
    priceUsdc: listing.priceUsdc,
    sellerAddress: listing.sellerAddress,
    maxUses: listing.maxUses ?? 1,
  },
  chainId
);
```

**Purchase** (`app/api/purchase/[slug]/route.ts`):

```typescript
// After successful purchase (line ~79)
sendPurchaseNotification(
  {
    slug,
    appName: listing.appName,
    appId: listing.appId,
    priceUsdc: listing.priceUsdc,
    sellerAddress: listing.sellerAddress,
    buyerAddress: result.paymentReceipt.payer?.toLowerCase() || "",
  },
  chainId
);
```

---

## Backfill Script

The backfill script sends Discord notifications for existing listings and purchases in the database.

### Usage

```bash
# Preview what would be sent (recommended first!)
pnpm backfill:discord -- --dry-run

# Backfill everything
pnpm backfill:discord

# Backfill only listings
pnpm backfill:discord -- --listings-only

# Backfill only purchases
pnpm backfill:discord -- --purchases-only

# Backfill only for mainnet (chain 8453)
pnpm backfill:discord -- --chain 8453

# Backfill only for testnet (chain 84532)
pnpm backfill:discord -- --chain 84532

# Backfill items created after a specific date
pnpm backfill:discord -- --since 2024-01-01

# Combine options
pnpm backfill:discord -- --listings-only --chain 8453 --since 2024-06-01

# Adjust delay between notifications (default: 1000ms)
pnpm backfill:discord -- --delay 500

# Show help
pnpm backfill:discord -- --help
```

### Options

| Option             | Description                                        |
| ------------------ | -------------------------------------------------- |
| `--dry-run`        | Preview without sending (highly recommended first) |
| `--listings-only`  | Only backfill new listings                         |
| `--purchases-only` | Only backfill purchases/sales                      |
| `--chain <id>`     | Filter by chain ID (8453 or 84532)                 |
| `--since <date>`   | Only items after this date (ISO format)            |
| `--delay <ms>`     | Delay between notifications (default: 1000ms)      |
| `--help`           | Show help message                                  |

### Example Output

```
🚀 Discord Backfill Script

Options:
  - Listings: ✅
  - Purchases: ✅
  - Chain: All
  - Since: All time
  - Dry run: ✅
  - Delay: 1000ms

Webhook Status:
  - Mainnet: ✅ Configured
  - Testnet: ✅ Configured

📡 Connecting to MongoDB...
✅ Connected!

📋 Backfilling Listings...

Found 12 listings to backfill

  [DRY RUN] Would send: 🆕 New Listing: Ethos
  [DRY RUN] Would send: 🆕 New Listing: Base App
  ...

🛒 Backfilling Purchases...

Found 5 purchases to backfill

  [DRY RUN] Would send: 💸 Sale: Ethos
  ...

==================================================
📊 Summary:
  - Listings sent: 12
  - Purchases sent: 5
  - Total: 17

⚠️  This was a dry run. No notifications were actually sent.
==================================================

📡 Disconnected from MongoDB
```

### Rate Limiting

Discord webhooks have rate limits. The script includes a configurable delay (default: 1000ms) between notifications to avoid hitting these limits. For large backfills, you may want to increase the delay:

```bash
pnpm backfill:discord -- --delay 2000
```

---

## Troubleshooting

### Notifications not appearing

1. Check webhook URLs are correctly set in `.env.local`
2. Verify the webhook is still active in Discord (not deleted)
3. Check server logs for error messages

### Rate limiting

If you see 429 errors, increase the delay between notifications or wait before retrying.

### Wrong channel

Verify `chainId` is correctly set in the database entries and matches the expected values (8453 for mainnet, 84532 for testnet).

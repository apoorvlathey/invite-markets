/**
 * Backfill script to manually add a missed sale to the database.
 *
 * This handles cases where an x402 payment succeeded on-chain but the
 * API response timed out before DB writes completed.
 *
 * Usage:
 *   pnpm backfill:sale
 *
 * The script will:
 * 1. Verify the listing exists and matches the seller
 * 2. Create a Transaction record
 * 3. Increment the listing's purchaseCount
 * 4. Mark listing as "sold" if all uses are consumed
 */

import { config } from "dotenv";
import mongoose from "mongoose";

// Load environment variables from .env.local
config({ path: ".env.local" });

const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  console.error("Error: MONGODB_URL not found in .env.local");
  process.exit(1);
}

// ============================================
// SALE DETAILS - Update these for each backfill
// ============================================
const SALE_DETAILS = {
  listingSlug: "6cu4175j",
  buyerAddress: "0xce90C3427E344a1774aE972e47b591DEa5c3800b",
  sellerAddress: "0x31aeE8fe58fa4468dBc471ebE00AA631308573D7",
  priceUsdc: 0.75,
  chainId: 8453, // Base Mainnet
  // Jan-13-2026 07:18:53 AM UTC
  timestamp: new Date("2026-01-13T07:18:53.000Z"),
};
// ============================================

async function backfillSale() {
  console.log("Connecting to MongoDB...");

  await mongoose.connect(MONGODB_URL!, {
    dbName: "InviteMarkets",
  });

  console.log("Connected to MongoDB\n");

  const db = mongoose.connection.db;

  if (!db) {
    console.error("Error: Could not get database connection");
    process.exit(1);
  }

  const listingsCollection = db.collection("listings");
  const transactionsCollection = db.collection("transactions");

  // Normalize addresses to lowercase
  const buyerAddress = SALE_DETAILS.buyerAddress.toLowerCase();
  const sellerAddress = SALE_DETAILS.sellerAddress.toLowerCase();

  console.log("=== Sale Details ===");
  console.log(`Listing Slug: ${SALE_DETAILS.listingSlug}`);
  console.log(`Buyer: ${buyerAddress}`);
  console.log(`Seller: ${sellerAddress}`);
  console.log(`Amount: ${SALE_DETAILS.priceUsdc} USDC`);
  console.log(`Chain ID: ${SALE_DETAILS.chainId}`);
  console.log(`Timestamp: ${SALE_DETAILS.timestamp.toISOString()}`);
  console.log("");

  // Step 1: Verify listing exists
  console.log("Step 1: Verifying listing exists...");
  const listing = await listingsCollection.findOne({
    slug: SALE_DETAILS.listingSlug,
    chainId: SALE_DETAILS.chainId,
  });

  if (!listing) {
    console.error(
      `Error: Listing with slug "${SALE_DETAILS.listingSlug}" not found on chain ${SALE_DETAILS.chainId}`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`  Found listing: ${listing.appName || listing.appId || "Unknown App"}`);
  console.log(`  Current status: ${listing.status}`);
  console.log(`  Listing seller: ${listing.sellerAddress}`);

  // Step 2: Verify seller matches
  console.log("\nStep 2: Verifying seller matches...");
  if (listing.sellerAddress.toLowerCase() !== sellerAddress) {
    console.error(
      `Error: Seller mismatch! Listing seller is ${listing.sellerAddress}, but provided ${sellerAddress}`
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("  Seller verified ✓");

  // Step 3: Check if transaction already exists
  console.log("\nStep 3: Checking for existing transaction...");
  const existingTx = await transactionsCollection.findOne({
    listingSlug: SALE_DETAILS.listingSlug,
    buyerAddress: buyerAddress,
    chainId: SALE_DETAILS.chainId,
    // Check within a 1-minute window of the timestamp
    createdAt: {
      $gte: new Date(SALE_DETAILS.timestamp.getTime() - 60000),
      $lte: new Date(SALE_DETAILS.timestamp.getTime() + 60000),
    },
  });

  if (existingTx) {
    console.log("  Transaction already exists! Skipping to avoid duplicate.");
    console.log(`  Existing transaction ID: ${existingTx._id}`);
    await mongoose.disconnect();
    process.exit(0);
  }
  console.log("  No existing transaction found ✓");

  // Step 4: Create transaction record
  console.log("\nStep 4: Creating transaction record...");
  const transactionDoc = {
    listingSlug: SALE_DETAILS.listingSlug,
    sellerAddress: sellerAddress,
    buyerAddress: buyerAddress,
    priceUsdc: SALE_DETAILS.priceUsdc,
    appId: listing.appId || null,
    chainId: SALE_DETAILS.chainId,
    createdAt: SALE_DETAILS.timestamp,
    updatedAt: SALE_DETAILS.timestamp,
  };

  const txResult = await transactionsCollection.insertOne(transactionDoc);
  console.log(`  Transaction created with ID: ${txResult.insertedId}`);

  // Step 5: Increment purchase count
  console.log("\nStep 5: Updating listing purchase count...");
  const currentCount = listing.purchaseCount ?? 0;
  const maxUses = listing.maxUses ?? 1;
  const newCount = currentCount + 1;

  // Determine if we should mark as sold
  // -1 means unlimited, so never mark as sold based on count
  const shouldMarkSold = maxUses !== -1 && newCount >= maxUses;

  const updateFields: Record<string, unknown> = {
    purchaseCount: newCount,
    updatedAt: new Date(),
  };

  if (shouldMarkSold) {
    updateFields.status = "sold";
  }

  await listingsCollection.updateOne(
    { slug: SALE_DETAILS.listingSlug, chainId: SALE_DETAILS.chainId },
    { $set: updateFields }
  );

  console.log(`  Purchase count: ${currentCount} → ${newCount}`);
  if (shouldMarkSold) {
    console.log(`  Status updated to "sold" (maxUses: ${maxUses})`);
  }

  // Summary
  console.log("\n=== Backfill Complete ===");
  console.log(`Transaction ID: ${txResult.insertedId}`);
  console.log(`Listing slug: ${SALE_DETAILS.listingSlug}`);
  console.log(`New purchase count: ${newCount}/${maxUses === -1 ? "∞" : maxUses}`);

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB");
}

backfillSale().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});

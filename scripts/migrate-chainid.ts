/**
 * Migration script to add chainId to existing Listing and Transaction documents.
 *
 * This script adds chainId = 84532 (Base Sepolia) to all documents that don't have
 * a chainId field yet.
 *
 * Usage:
 *   pnpm migrate:chainid
 */

import { config } from "dotenv";
import mongoose from "mongoose";

// Load environment variables from .env.local
config({ path: ".env.local" });

const MONGODB_URL = process.env.MONGODB_URL;
const BASE_SEPOLIA_CHAIN_ID = 84532;

if (!MONGODB_URL) {
  console.error("Error: MONGODB_URL not found in .env.local");
  process.exit(1);
}

async function migrate() {
  console.log("Connecting to MongoDB...");

  await mongoose.connect(MONGODB_URL!, {
    dbName: "InviteMarkets",
  });

  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  if (!db) {
    console.error("Error: Could not get database connection");
    process.exit(1);
  }

  // Migrate Listings
  console.log("\n--- Migrating Listings ---");
  const listingsCollection = db.collection("listings");

  const listingsWithoutChainId = await listingsCollection.countDocuments({
    chainId: { $exists: false },
  });

  console.log(`Found ${listingsWithoutChainId} listings without chainId`);

  if (listingsWithoutChainId > 0) {
    const listingsResult = await listingsCollection.updateMany(
      { chainId: { $exists: false } },
      { $set: { chainId: BASE_SEPOLIA_CHAIN_ID } }
    );
    console.log(
      `Updated ${listingsResult.modifiedCount} listings with chainId: ${BASE_SEPOLIA_CHAIN_ID}`
    );
  }

  // Migrate Transactions
  console.log("\n--- Migrating Transactions ---");
  const transactionsCollection = db.collection("transactions");

  const transactionsWithoutChainId =
    await transactionsCollection.countDocuments({
      chainId: { $exists: false },
    });

  console.log(
    `Found ${transactionsWithoutChainId} transactions without chainId`
  );

  if (transactionsWithoutChainId > 0) {
    const transactionsResult = await transactionsCollection.updateMany(
      { chainId: { $exists: false } },
      { $set: { chainId: BASE_SEPOLIA_CHAIN_ID } }
    );
    console.log(
      `Updated ${transactionsResult.modifiedCount} transactions with chainId: ${BASE_SEPOLIA_CHAIN_ID}`
    );
  }

  // Print summary
  console.log("\n--- Migration Summary ---");
  const totalListings = await listingsCollection.countDocuments({});
  const totalTransactions = await transactionsCollection.countDocuments({});
  const listingsWithChainId = await listingsCollection.countDocuments({
    chainId: { $exists: true },
  });
  const transactionsWithChainId = await transactionsCollection.countDocuments({
    chainId: { $exists: true },
  });

  console.log(`Listings: ${listingsWithChainId}/${totalListings} have chainId`);
  console.log(
    `Transactions: ${transactionsWithChainId}/${totalTransactions} have chainId`
  );

  await mongoose.disconnect();
  console.log("\nMigration complete!");
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

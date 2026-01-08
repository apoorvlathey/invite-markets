import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { ITransaction, Transaction } from "@/models/transaction";
import { Listing } from "@/models/listing";
import { getAppIconInfo, getFaviconUrl, type AppIconInfo } from "@/lib/url";
import { featuredApps } from "@/data/featuredApps";
import { chainId } from "@/lib/chain";

/**
 * Gets the app icon info for a transaction by looking up the associated listing.
 */
async function getTransactionAppIconInfo(transaction: ITransaction): Promise<AppIconInfo> {
  // Try to get listing to fetch appIconUrl if available
  try {
    const listing = await Listing.findOne({ slug: transaction.listingSlug }).lean();
    
    if (listing) {
      return getAppIconInfo({
        appId: listing.appId,
        appName: listing.appName,
        inviteUrl: listing.inviteUrl,
        appUrl: listing.appUrl,
        listingType: listing.listingType,
      });
    }
  } catch (error) {
    console.error("Error fetching listing for icon:", error);
  }

  // Fallback: check if appId matches a featured app
  if (transaction.appId) {
    const featuredApp = featuredApps.find((app) => app.id === transaction.appId);
    if (featuredApp) {
      return { url: featuredApp.appIconUrl };
    }
  }

  // Return default favicon
  return { url: getFaviconUrl("") };
}

/**
 * Gets the app name for a transaction.
 */
async function getAppName(transaction: ITransaction): Promise<string> {
  // Check if this is a featured app by appId
  if (transaction.appId) {
    const featuredApp = featuredApps.find((app) => app.id === transaction.appId);
    if (featuredApp) {
      return featuredApp.appName;
    }
  }

  // Try to get listing to fetch appName
  try {
    const listing = await Listing.findOne({ slug: transaction.listingSlug }).lean();
    if (listing?.appName) {
      return listing.appName;
    }
  } catch (error) {
    console.error("Error fetching listing for name:", error);
  }

  // Fallback to appId or "App"
  return transaction.appId || "App";
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Fetch transactions sorted by createdAt descending (newest first)
    const transactions = await Transaction.find({ chainId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments({ chainId });

    // Enrich transactions with app info
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const iconInfo = await getTransactionAppIconInfo(tx);
        const appName = await getAppName(tx);

        return {
          _id: tx._id,
          listingSlug: tx.listingSlug,
          sellerAddress: tx.sellerAddress,
          buyerAddress: tx.buyerAddress,
          priceUsdc: tx.priceUsdc,
          appId: tx.appId,
          appName,
          appIconUrl: iconInfo.url,
          iconNeedsDarkBg: iconInfo.needsDarkBg || false,
          chainId: tx.chainId,
          createdAt: tx.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
      },
      { status: 500 }
    );
  }
}
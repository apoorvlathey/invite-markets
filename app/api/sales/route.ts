import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { ITransaction, Transaction } from "@/models/transaction";
import { Listing } from "@/models/listing";
import { getDomain, getFaviconUrl } from "@/lib/url";
import { featuredApps } from "@/data/featuredApps";
import { chainId } from "@/lib/chain";

/**
 * Gets the app icon URL for a transaction.
 * First checks if the listing has an appIconUrl.
 * For featured apps, uses the configured icon.
 * For non-featured apps, generates a favicon URL.
 */
async function getAppIconUrl(transaction: ITransaction): Promise<string> {
  // Try to get listing to fetch appIconUrl if available
  try {
    const listing = await Listing.findOne({ slug: transaction.listingSlug }).lean();
    
    if (listing) {
      // Check if this is a featured app
      if (listing.appId) {
        const featuredApp = featuredApps.find((app) => app.id === listing.appId);
        if (featuredApp) {
          return featuredApp.appIconUrl;
        }
      }

      // For non-featured apps, get favicon from the domain
      // Use appUrl for access_code type, inviteUrl for invite_link type
      const url =
        listing.listingType === "access_code" ? listing.appUrl : listing.inviteUrl;

      if (url) {
        const domain = getDomain(url);
        return getFaviconUrl(domain);
      }
    }
  } catch (error) {
    console.error("Error fetching listing for icon:", error);
  }

  // Fallback: check if appId matches a featured app
  if (transaction.appId) {
    const featuredApp = featuredApps.find((app) => app.id === transaction.appId);
    if (featuredApp) {
      return featuredApp.appIconUrl;
    }
  }

  // Return default favicon
  return getFaviconUrl("");
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
        const appIconUrl = await getAppIconUrl(tx);
        const appName = await getAppName(tx);

        return {
          _id: tx._id,
          listingSlug: tx.listingSlug,
          sellerAddress: tx.sellerAddress,
          buyerAddress: tx.buyerAddress,
          priceUsdc: tx.priceUsdc,
          appId: tx.appId,
          appName,
          appIconUrl,
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
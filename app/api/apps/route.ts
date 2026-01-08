import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";
import { featuredApps, getFeaturedAppsForChain } from "@/data/featuredApps";
import { getAppIconInfo } from "@/lib/url";
import { chainId } from "@/lib/chain";

interface AppAggregation {
  _id: string | null;
  appName: string | null;
  totalListings: number;
  activeListings: number;
  lowestPrice: number | null;
  sampleInviteUrl: string | null;
  sampleAppUrl: string | null;
}

interface AppData {
  id: string;
  name: string;
  iconUrl: string;
  iconNeedsDarkBg: boolean;
  description: string;
  siteUrl?: string;
  totalListings: number;
  activeListings: number;
  lowestPrice: number | null;
  isFeatured: boolean;
}

/**
 * GET /api/apps
 * Returns all unique apps across all listings with aggregated data.
 * Combines featured apps data with custom apps from listings.
 */
export async function GET() {
  try {
    await connectDB();

    // Aggregate listings by app
    // Group by appId first (for featured apps), then by appName (for custom apps)
    const aggregations = await Listing.aggregate([
      {
        $match: { chainId },
      },
      {
        $group: {
          _id: { $ifNull: ["$appId", "$appName"] },
          appId: { $first: "$appId" },
          appName: { $first: "$appName" },
          totalListings: { $sum: 1 },
          activeListings: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          lowestActivePrice: {
            $min: {
              $cond: [{ $eq: ["$status", "active"] }, "$priceUsdc", null],
            },
          },
          sampleInviteUrl: { $first: "$inviteUrl" },
          sampleAppUrl: { $first: "$appUrl" },
        },
      },
      {
        $project: {
          _id: 1,
          appName: 1,
          totalListings: 1,
          activeListings: 1,
          lowestPrice: "$lowestActivePrice",
          sampleInviteUrl: 1,
          sampleAppUrl: 1,
        },
      },
    ]);

    // Build the apps list
    const appsMap = new Map<string, AppData>();

    // First, add all featured apps for the current chain (even if they have no listings)
    for (const featuredApp of getFeaturedAppsForChain()) {
      appsMap.set(featuredApp.id, {
        id: featuredApp.id,
        name: featuredApp.appName,
        iconUrl: featuredApp.appIconUrl,
        iconNeedsDarkBg: false, // Featured apps have proper icons
        description: featuredApp.description,
        siteUrl: featuredApp.siteUrl,
        totalListings: 0,
        activeListings: 0,
        lowestPrice: null,
        isFeatured: true,
      });
    }

    // Process aggregations
    for (const agg of aggregations as AppAggregation[]) {
      const appKey = agg._id;
      if (!appKey) continue;

      // Check if this is a featured app
      const featuredApp = featuredApps.find((fa) => fa.id === appKey);

      if (featuredApp) {
        // Update featured app with listing data
        const existing = appsMap.get(featuredApp.id)!;
        existing.totalListings = agg.totalListings;
        existing.activeListings = agg.activeListings;
        existing.lowestPrice = agg.lowestPrice;
      } else {
        // This is a custom app
        const appName = agg.appName || appKey;
        
        // Use centralized icon resolution
        const iconInfo = getAppIconInfo({
          appName,
          inviteUrl: agg.sampleInviteUrl || undefined,
          appUrl: agg.sampleAppUrl || undefined,
          listingType: agg.sampleAppUrl ? "access_code" : "invite_link",
        });

        appsMap.set(appKey, {
          id: appKey,
          name: appName,
          iconUrl: iconInfo.url,
          iconNeedsDarkBg: iconInfo.needsDarkBg || false,
          description: `Early access invites for ${appName}`,
          totalListings: agg.totalListings,
          activeListings: agg.activeListings,
          lowestPrice: agg.lowestPrice,
          isFeatured: false,
        });
      }
    }

    // Convert to array and sort: featured first, then by active listings, then by total listings
    const apps = Array.from(appsMap.values()).sort((a, b) => {
      // Featured apps first
      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }
      // Then by active listings (descending)
      if (a.activeListings !== b.activeListings) {
        return b.activeListings - a.activeListings;
      }
      // Then by total listings (descending)
      return b.totalListings - a.totalListings;
    });

    return NextResponse.json({
      success: true,
      apps,
      totalApps: apps.length,
      featuredCount: apps.filter((a) => a.isFeatured).length,
    });
  } catch (error) {
    console.error("Error fetching apps:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";
import { chainId } from "@/lib/chain";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const appId = searchParams.get("appId");
    const appName = searchParams.get("appName");

    if (!appId && !appName) {
      return NextResponse.json(
        { error: "Either appId or appName must be provided" },
        { status: 400 }
      );
    }

    await connectDB();

    // Build app matching conditions
    // For custom apps, listings might have appId OR appName depending on how they were created:
    // - First listing for a custom app: appName only
    // - Subsequent listings from dropdown: appId (which equals the original appName)
    // So we need to match by BOTH appId and appName to find all listings for the same app
    const appMatchConditions: Record<string, unknown>[] = [];

    if (appId) {
      // Match listings where appId equals the provided appId
      appMatchConditions.push({ appId });
      // Also match listings where appName equals the appId (for original custom app listings)
      appMatchConditions.push({ appName: { $regex: new RegExp(`^${appId}$`, "i") } });
    }

    if (appName) {
      // Match listings where appName equals the provided appName (case-insensitive)
      appMatchConditions.push({ appName: { $regex: new RegExp(`^${appName}$`, "i") } });
      // Also match listings where appId equals the appName (for subsequent dropdown selections)
      appMatchConditions.push({ appId: appName });
    }

    // Use aggregation pipeline for complex availability check
    const pipeline = [
      {
        $match: {
          status: "active",
          chainId,
          $or: appMatchConditions,
        },
      },
      {
        // Add computed availability field
        $addFields: {
          isAvailable: {
            $or: [
              { $eq: ["$maxUses", -1] }, // Unlimited
              {
                $lt: [
                  { $ifNull: ["$purchaseCount", 0] },
                  { $ifNull: ["$maxUses", 1] },
                ],
              },
            ],
          },
        },
      },
      {
        // Filter to only available listings
        $match: { isAvailable: true },
      },
      {
        // Sort by price ascending
        $sort: { priceUsdc: 1 as const },
      },
      {
        // Get only the first (cheapest) one
        $limit: 1,
      },
      {
        // Project only what we need
        $project: { priceUsdc: 1 },
      },
    ];

    const results = await Listing.aggregate(pipeline);
    const lowestPriceListing = results[0] || null;

    if (!lowestPriceListing) {
      return NextResponse.json({
        success: true,
        lowestPrice: null,
      });
    }

    return NextResponse.json({
      success: true,
      lowestPrice: lowestPriceListing.priceUsdc,
    });
  } catch (error) {
    console.error("Error fetching lowest price:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


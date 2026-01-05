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

    // Build query based on whether it's a featured app (appId) or custom app (appName)
    const query: Record<string, unknown> = {
      status: "active",
      chainId,
    };

    if (appId) {
      query.appId = appId;
    } else if (appName) {
      // Case-insensitive match for custom app names
      query.appName = { $regex: new RegExp(`^${appName}$`, "i") };
    }

    // Find the listing with the lowest price
    const lowestPriceListing = await Listing.findOne(query)
      .sort({ priceUsdc: 1 })
      .select("priceUsdc")
      .lean();

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


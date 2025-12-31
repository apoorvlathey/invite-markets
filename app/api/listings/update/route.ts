import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      slug, 
      sellerAddress, 
      priceUsdc, 
      inviteUrl,
      appId,
      appName 
    } = body;

    if (!slug || !sellerAddress) {
      return NextResponse.json(
        { success: false, error: "Slug and seller address are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the listing and verify ownership
    const listing = await Listing.findOne({
      slug,
      sellerAddress: sellerAddress.toLowerCase(),
      status: "active",
    });

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found or not owned by seller" },
        { status: 404 }
      );
    }

    // Update allowed fields
    if (priceUsdc !== undefined) {
      if (typeof priceUsdc !== "number" || priceUsdc <= 0) {
        return NextResponse.json(
          { success: false, error: "Price must be a positive number" },
          { status: 400 }
        );
      }
      listing.priceUsdc = priceUsdc;
    }

    if (inviteUrl !== undefined) {
      if (!inviteUrl || typeof inviteUrl !== "string") {
        return NextResponse.json(
          { success: false, error: "Invalid invite URL" },
          { status: 400 }
        );
      }
      listing.inviteUrl = inviteUrl;
    }

    if (appId !== undefined) {
      listing.appId = appId?.trim() || undefined;
    }

    if (appName !== undefined) {
      listing.appName = appName?.trim() || undefined;
    }

    // Ensure at least appId or appName exists
    if (!listing.appId && !listing.appName) {
      return NextResponse.json(
        { success: false, error: "Either appId or appName must be provided" },
        { status: 400 }
      );
    }

    await listing.save();

    return NextResponse.json({
      success: true,
      listing: {
        id: listing._id.toString(),
        slug: listing.slug,
        priceUsdc: listing.priceUsdc,
        inviteUrl: listing.inviteUrl,
        appId: listing.appId,
        appName: listing.appName,
        status: listing.status,
        updatedAt: listing.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating listing:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update listing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
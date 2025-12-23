import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await params;

    const listing = await Listing.findOne({ slug });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      listing: {
        slug: listing.slug,
        inviteUrl: listing.inviteUrl,
        priceUsdc: listing.priceUsdc,
        sellerAddress: listing.sellerAddress,
        status: listing.status,
        appId: listing.appId,
        appName: listing.appName,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


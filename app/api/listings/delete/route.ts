import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, sellerAddress } = body;

    if (!slug || !sellerAddress) {
      return NextResponse.json(
        { success: false, error: "Slug and seller address are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find and delete the listing, verifying ownership
    const result = await Listing.deleteOne({
      slug,
      sellerAddress: sellerAddress.toLowerCase(),
      status: "active",
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Listing not found or not owned by seller" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting listing:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete listing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
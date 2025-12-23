import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getListingBySlug } from "@/lib/listing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await params;

    const listing = await getListingBySlug(slug, false);

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      listing
    });
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


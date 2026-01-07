import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models/transaction";
import { Listing } from "@/models/listing";
import { chainId } from "@/lib/chain";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;

    // First, find all listing slugs that belong to this app
    // (needed because transactions store listingSlug, not appId/appName directly for all cases)
    const listings = await Listing.find({
      $or: [{ appId: slug }, { appName: slug }],
      chainId,
    })
      .select("slug appId")
      .lean<{ slug: string; appId: string }[]>();

    const listingSlugs = listings.map((l) => l.slug);

    if (listingSlugs.length === 0) {
      return NextResponse.json([]);
    }

    // Query transactions for all listings of this app
    // Return full transaction objects for the sales tab UI
    const transactions = await Transaction.find({
      listingSlug: { $in: listingSlugs },
      chainId,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales data" },
      { status: 500 }
    );
  }
}

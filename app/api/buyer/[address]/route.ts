import { NextResponse } from "next/server";
import { Transaction } from "@/models/transaction";
import { connectDB } from "@/lib/mongoose";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params; 

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch all purchases where the user is the buyer
    const purchases = await Transaction.find({
      buyerAddress: address.toLowerCase(),
    })
      .sort({ createdAt: -1 })
      .lean();

      console.log("purchases", purchases)

    return NextResponse.json({
      success: true,
      purchases: purchases.map((p) => ({
        id: p._id.toString(),
        listingSlug: p.listingSlug,
        sellerAddress: p.sellerAddress,
        priceUsdc: p.priceUsdc,
        appId: p.appId,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}
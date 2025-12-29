import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models/transaction";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await connectDB();

    const { address } = await params; 

    // Count completed sales for this seller
    const salesCount = await Transaction.countDocuments({
      sellerAddress: address,
    });

    // Get total revenue
    const revenueResult = await Transaction.aggregate([
      { $match: { sellerAddress: address } },
      { $group: { _id: null, total: { $sum: "$priceUsdc" } } },
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    return NextResponse.json({
      success: true,
      stats: {
        salesCount,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Error fetching seller stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch seller statistics" },
      { status: 500 }
    );
  }
}
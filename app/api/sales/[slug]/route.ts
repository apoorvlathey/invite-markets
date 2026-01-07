import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models/transaction";
import { chainId } from "@/lib/chain";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;

    // Fetch transactions for this specific app
    const transactions = await Transaction.find({
      $or: [{ appId: slug }],
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
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

    const sales = await Listing.find({
      $or: [{ appId: slug }, { appName: slug }],
      status: "sold",
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .select("priceUsdc updatedAt appId")
      .lean();

    const formattedSales = sales.map((sale: any) => ({
      timestamp: sale.updatedAt,
      priceUsdc: sale.priceUsdc,
      slug: sale.appId,
    }));

    return NextResponse.json(formattedSales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales data" },
      { status: 500 }
    );
  }
}
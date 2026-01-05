import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models/transaction";
import { Listing } from "@/models/listing";
import { chainId } from "@/lib/chain";
import { verifyMessage } from "viem";

/**
 * Verify if the request is authenticated as the seller.
 * Uses signature verification via headers:
 * - x-seller-signature: The signature
 * - x-seller-message: Base64 encoded message that was signed
 *
 * The message should contain a timestamp that's within 5 minutes.
 */
async function verifySellerAuth(
  request: NextRequest,
  expectedAddress: string
): Promise<boolean> {
  const signature = request.headers.get("x-seller-signature");
  const encodedMessage = request.headers.get("x-seller-message");

  if (!signature || !encodedMessage) {
    return false;
  }

  try {
    // Decode the base64 message
    const message = Buffer.from(encodedMessage, "base64").toString("utf-8");

    // Verify the signature matches the expected seller address
    const isValid = await verifyMessage({
      address: expectedAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return false;
    }

    // Check if message timestamp is recent (within 5 minutes, not in the future)
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (timestampMatch) {
      const messageTimestamp = parseInt(timestampMatch[1]);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      // Reject future timestamps (with small grace period for clock skew)
      if (messageTimestamp > now + 30000) {
        return false;
      }

      // Reject timestamps older than 5 minutes
      if (now - messageTimestamp > fiveMinutes) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await connectDB();

    const { address } = await params;
    const normalizedAddress = address.toLowerCase();

    // Check if this is an authenticated request from the seller
    const isAuthenticated = await verifySellerAuth(request, normalizedAddress);

    // Count completed sales for this seller
    const salesCount = await Transaction.countDocuments({
      sellerAddress: normalizedAddress,
      chainId,
    });

    // Get total revenue
    const revenueResult = await Transaction.aggregate([
      { $match: { sellerAddress: normalizedAddress, chainId } },
      { $group: { _id: null, total: { $sum: "$priceUsdc" } } },
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Get all listings for this seller
    // Only include inviteUrl if the request is authenticated as the seller
    const listingsQuery = Listing.find({
      sellerAddress: normalizedAddress,
      chainId,
    }).sort({ createdAt: -1 });

    // Exclude inviteUrl for unauthenticated requests (security)
    if (!isAuthenticated) {
      listingsQuery.select("-inviteUrl");
    }

    const listings = await listingsQuery.lean();

    return NextResponse.json({
      success: true,
      isAuthenticated, // Let frontend know if auth succeeded
      stats: {
        salesCount,
        totalRevenue,
      },
      listings,
    });
  } catch (error) {
    console.error("Error fetching seller stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch seller statistics" },
      { status: 500 }
    );
  }
}

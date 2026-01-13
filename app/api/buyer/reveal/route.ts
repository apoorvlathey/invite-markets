import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models/transaction";
import { Listing } from "@/models/listing";
import { chainId } from "@/lib/chain";
import { verifyMessageSignature } from "@/lib/viem";

/**
 * Verify if the request is authenticated as the buyer.
 * Uses signature verification via request body:
 * - signature: The wallet signature
 * - message: Base64 encoded message that was signed
 *
 * The message should contain a timestamp that's within 5 minutes
 * and the address that signed it.
 */
async function verifyBuyerAuth(
  signature: string,
  encodedMessage: string,
  expectedAddress: string
): Promise<boolean> {
  if (!signature || !encodedMessage) {
    return false;
  }

  try {
    // Decode the base64 message
    const message = Buffer.from(encodedMessage, "base64").toString("utf-8");

    // Verify the signature matches the expected buyer address
    // Uses thirdweb's verifySignature which supports both EOAs and smart contract wallets (ERC-1271)
    const isValid = await verifyMessageSignature({
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

    // Verify the address in the message matches the expected address
    const addressMatch = message.match(/Address: (0x[a-fA-F0-9]+)/i);
    if (addressMatch) {
      const messageAddress = addressMatch[1].toLowerCase();
      if (messageAddress !== expectedAddress.toLowerCase()) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/buyer/reveal
 *
 * Reveals the secret data (inviteUrl or accessCode) for a purchased listing.
 * Requires signature verification to ensure only the buyer can access their purchase.
 *
 * Request body:
 * - transactionId: The ID of the transaction (purchase) record
 * - signature: Wallet signature
 * - message: Base64 encoded message that was signed
 *
 * Response:
 * - success: boolean
 * - listingType: "invite_link" | "access_code"
 * - inviteUrl?: string (for invite_link type)
 * - appUrl?: string (for access_code type)
 * - accessCode?: string (for access_code type)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { transactionId, signature, message } = body;

    if (!transactionId || !signature || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the transaction
    const transaction = await Transaction.findById(transactionId).lean();

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Verify chain ID matches
    if (transaction.chainId !== chainId) {
      return NextResponse.json(
        { success: false, error: "Transaction not found on this network" },
        { status: 404 }
      );
    }

    // Verify the signature is from the buyer
    const isAuthenticated = await verifyBuyerAuth(
      signature,
      message,
      transaction.buyerAddress
    );

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Invalid signature or unauthorized" },
        { status: 401 }
      );
    }

    // Fetch the listing with secret data
    const listing = await Listing.findOne({
      slug: transaction.listingSlug,
      chainId,
    }).lean();

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    // Return the secret data based on listing type
    const listingType = listing.listingType || "invite_link";

    if (listingType === "access_code") {
      return NextResponse.json({
        success: true,
        listingType: "access_code",
        appUrl: listing.appUrl,
        accessCode: listing.accessCode,
      });
    }

    // Default: invite_link type
    return NextResponse.json({
      success: true,
      listingType: "invite_link",
      inviteUrl: listing.inviteUrl,
    });
  } catch (error) {
    console.error("Error revealing purchase:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reveal purchase" },
      { status: 500 }
    );
  }
}

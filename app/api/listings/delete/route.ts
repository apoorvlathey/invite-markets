import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";
import { verifyTypedData } from "viem";
import {
  getEIP712Domain,
  EIP712_DELETE_TYPES,
  type DeleteListingMessage,
} from "@/lib/signature";
import { chainId } from "@/lib/chain";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slug,
      sellerAddress,
      nonce,
      chainId: clientChainId,
      signature,
    } = body;

    // Validate required fields including signature
    if (!slug || !sellerAddress || !nonce || !clientChainId || !signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: slug, sellerAddress, nonce, chainId, signature",
        },
        { status: 400 }
      );
    }

    // Validate that the client's chainId matches the server's expected chainId
    if (clientChainId !== chainId) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid chain. Expected chainId ${chainId}, got ${clientChainId}. Please switch to the correct network.`,
        },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(sellerAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    // Verify EIP-712 signature
    const message: DeleteListingMessage = {
      slug,
      sellerAddress: sellerAddress as `0x${string}`,
      nonce: BigInt(nonce),
    };

    const isValid = await verifyTypedData({
      address: sellerAddress as `0x${string}`,
      domain: getEIP712Domain(chainId),
      types: EIP712_DELETE_TYPES,
      primaryType: "DeleteListing",
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid signature. Please sign the message with your wallet.",
        },
        { status: 401 }
      );
    }

    // Check nonce is recent (within 5 minutes)
    const nonceTime = Number(nonce);
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(currentTime - nonceTime) > fiveMinutes) {
      return NextResponse.json(
        { success: false, error: "Signature expired. Please try again." },
        { status: 401 }
      );
    }

    await connectDB();

    // Find and delete the listing, verifying ownership
    const result = await Listing.deleteOne({
      slug,
      sellerAddress: sellerAddress.toLowerCase(),
      status: "active",
      chainId,
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

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";
import { verifyTypedData } from "viem";
import {
  getEIP712Domain,
  EIP712_UPDATE_TYPES,
  type UpdateListingMessage,
} from "@/lib/signature";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      slug, 
      sellerAddress, 
      priceUsdc, 
      inviteUrl,
      appId,
      appName,
      nonce,
      chainId,
      signature,
    } = body;

    // Validate required fields including signature
    if (!slug || !sellerAddress || !nonce || !chainId || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: slug, sellerAddress, nonce, chainId, signature" },
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
    const message: UpdateListingMessage = {
      slug,
      inviteUrl: inviteUrl || "",
      priceUsdc: priceUsdc?.toString() || "",
      sellerAddress: sellerAddress as `0x${string}`,
      appName: appName || "",
      nonce: BigInt(nonce),
    };

    const isValid = await verifyTypedData({
      address: sellerAddress as `0x${string}`,
      domain: getEIP712Domain(chainId),
      types: EIP712_UPDATE_TYPES,
      primaryType: "UpdateListing",
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid signature. Please sign the message with your wallet." },
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

    // Find the listing and verify ownership
    const listing = await Listing.findOne({
      slug,
      sellerAddress: sellerAddress.toLowerCase(),
      status: "active",
    });

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found or not owned by seller" },
        { status: 404 }
      );
    }

    // Update allowed fields
    if (priceUsdc !== undefined) {
      if (typeof priceUsdc !== "number" || priceUsdc <= 0) {
        return NextResponse.json(
          { success: false, error: "Price must be a positive number" },
          { status: 400 }
        );
      }
      listing.priceUsdc = priceUsdc;
    }

    if (inviteUrl !== undefined) {
      if (!inviteUrl || typeof inviteUrl !== "string") {
        return NextResponse.json(
          { success: false, error: "Invalid invite URL" },
          { status: 400 }
        );
      }
      listing.inviteUrl = inviteUrl;
    }

    if (appId !== undefined) {
      listing.appId = appId?.trim() || undefined;
    }

    if (appName !== undefined) {
      listing.appName = appName?.trim() || undefined;
    }

    // Ensure at least appId or appName exists
    if (!listing.appId && !listing.appName) {
      return NextResponse.json(
        { success: false, error: "Either appId or appName must be provided" },
        { status: 400 }
      );
    }

    await listing.save();

    return NextResponse.json({
      success: true,
      listing: {
        id: listing._id.toString(),
        slug: listing.slug,
        priceUsdc: listing.priceUsdc,
        inviteUrl: listing.inviteUrl,
        appId: listing.appId,
        appName: listing.appName,
        status: listing.status,
        updatedAt: listing.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating listing:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update listing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
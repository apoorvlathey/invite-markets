import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Listing, type ListingType } from "@/models/listing";
import { verifyTypedData } from "viem";
import {
  getEIP712Domain,
  EIP712_UPDATE_TYPES,
  type UpdateListingMessage,
} from "@/lib/signature";
import { chainId } from "@/lib/chain";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slug,
      sellerAddress,
      priceUsdc,
      inviteUrl,
      appUrl,
      accessCode,
      appId,
      appName,
      maxUses,
      description,
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

    await connectDB();

    // Find the listing first to determine its type
    const listing = await Listing.findOne({
      slug,
      sellerAddress: sellerAddress.toLowerCase(),
      status: "active",
      chainId,
    });

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found or not owned by seller" },
        { status: 404 }
      );
    }

    const listingType: ListingType = listing.listingType || "invite_link";

    // Get current maxUses for the message (use provided value or current)
    const currentMaxUses = listing.maxUses ?? 1;
    const messageMaxUses =
      maxUses !== undefined ? maxUses.toString() : currentMaxUses.toString();

    // Verify EIP-712 signature
    const message: UpdateListingMessage = {
      slug,
      listingType,
      inviteUrl: inviteUrl || "",
      appUrl: appUrl || "",
      accessCode: accessCode || "",
      priceUsdc: priceUsdc?.toString() || "",
      sellerAddress: sellerAddress as `0x${string}`,
      appName: appName || "",
      maxUses: messageMaxUses,
      description: description || "",
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

    // Handle fields based on listing type
    if (listingType === "invite_link") {
      // Only update inviteUrl if a non-empty value is provided
      // Empty string means "keep existing URL" for security (URL not exposed in API)
      if (inviteUrl !== undefined && inviteUrl !== "") {
        if (typeof inviteUrl !== "string") {
          return NextResponse.json(
            { success: false, error: "Invalid invite URL" },
            { status: 400 }
          );
        }
        listing.inviteUrl = inviteUrl;
      }
    } else if (listingType === "access_code") {
      // Update appUrl if provided
      if (appUrl !== undefined && appUrl !== "") {
        if (typeof appUrl !== "string") {
          return NextResponse.json(
            { success: false, error: "Invalid app URL" },
            { status: 400 }
          );
        }
        listing.appUrl = appUrl;
      }
      // Update accessCode if provided
      if (accessCode !== undefined && accessCode !== "") {
        if (typeof accessCode !== "string") {
          return NextResponse.json(
            { success: false, error: "Invalid access code" },
            { status: 400 }
          );
        }
        listing.accessCode = accessCode;
      }
    }

    if (appId !== undefined) {
      listing.appId = appId?.trim() || undefined;
    }

    if (appName !== undefined) {
      listing.appName = appName?.trim() || undefined;
    }

    // Update description if provided (can be empty string to clear it)
    if (description !== undefined) {
      listing.description = description?.trim() || undefined;
    }

    // Handle maxUses update (only allow increasing to prevent abuse)
    if (maxUses !== undefined) {
      const newMaxUses =
        typeof maxUses === "number" ? maxUses : parseInt(maxUses, 10);

      if (isNaN(newMaxUses) || newMaxUses < -1 || newMaxUses === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "maxUses must be -1 (unlimited) or a positive number",
          },
          { status: 400 }
        );
      }

      // -1 means unlimited - always allowed as it's the most permissive
      // Otherwise, new value must be >= current value (or current is unlimited)
      if (
        newMaxUses !== -1 &&
        currentMaxUses !== -1 &&
        newMaxUses < currentMaxUses
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot decrease maxUses. You can only increase it.",
          },
          { status: 400 }
        );
      }

      listing.maxUses = newMaxUses;
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
        listingType,
        priceUsdc: listing.priceUsdc,
        // inviteUrl and accessCode intentionally omitted for security
        // appUrl is public for access_code type
        appUrl: listingType === "access_code" ? listing.appUrl : undefined,
        appId: listing.appId,
        appName: listing.appName,
        maxUses: listing.maxUses ?? 1,
        purchaseCount: listing.purchaseCount ?? 0,
        description: listing.description,
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

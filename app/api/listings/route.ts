import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";
import { customAlphabet } from "nanoid";
import { verifyTypedData } from "viem";
import {
  getEIP712Domain,
  EIP712_TYPES,
  type ListingMessage,
} from "@/lib/signature";
import { getDomain, getFaviconUrl } from "@/lib/url";
import { featuredApps } from "@/data/featuredApps";
import { chainId } from "@/lib/chain";

// Create a custom nanoid with URL-safe characters
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

/**
 * Gets the app icon URL for a listing.
 * For featured apps, uses the configured icon.
 * For non-featured apps, extracts the domain from the invite URL (without the invite code)
 * and generates a favicon URL.
 */
function getAppIconUrl(listing: { appId?: string; inviteUrl: string }): string {
  // Check if this is a featured app
  if (listing.appId) {
    const featuredApp = featuredApps.find((app) => app.id === listing.appId);
    if (featuredApp) {
      return featuredApp.appIconUrl;
    }
  }

  // For non-featured apps, get favicon from the domain (strips invite code)
  const domain = getDomain(listing.inviteUrl);
  return getFaviconUrl(domain);
}

export async function GET() {
  try {
    await connectDB();

    const listings = await Listing.find({ chainId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      listings: listings.map((listing) => ({
        slug: listing.slug,
        priceUsdc: listing.priceUsdc,
        sellerAddress: listing.sellerAddress,
        status: listing.status,
        appId: listing.appId,
        appName: listing.appName,
        appIconUrl: getAppIconUrl(listing),
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      inviteUrl,
      priceUsdc,
      sellerAddress,
      nonce,
      chainId,
      signature,
      appId,
      appName,
    } = body;

    // Debug logging
    console.log("Received data:", { appId, appName });
    console.log(
      "appId type:",
      typeof appId,
      "value:",
      appId,
      "trimmed:",
      appId?.trim()
    );
    console.log(
      "appName type:",
      typeof appName,
      "value:",
      appName,
      "trimmed:",
      appName?.trim()
    );

    // Validate required fields
    if (
      !inviteUrl ||
      !priceUsdc ||
      !sellerAddress ||
      !nonce ||
      !chainId ||
      !signature
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: inviteUrl, priceUsdc, sellerAddress, nonce, chainId, signature",
        },
        { status: 400 }
      );
    }

    // Validate that either appId or appName is provided
    if (!appId && !appName) {
      return NextResponse.json(
        { error: "Either appId or appName must be provided" },
        { status: 400 }
      );
    }

    // Validate price
    if (typeof priceUsdc !== "number" || priceUsdc <= 0) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(sellerAddress)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    // Verify EIP-712 signature
    const message: ListingMessage = {
      inviteUrl,
      priceUsdc: priceUsdc.toString(),
      sellerAddress: sellerAddress as `0x${string}`,
      appId: appId || "",
      appName: appName || "",
      nonce: BigInt(nonce),
    };

    const isValid = await verifyTypedData({
      address: sellerAddress as `0x${string}`,
      domain: getEIP712Domain(chainId),
      types: EIP712_TYPES,
      primaryType: "CreateListing",
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        {
          error: "Invalid signature. Please sign the message with your wallet.",
        },
        { status: 401 }
      );
    }

    // Additional security: Check nonce is recent (within 5 minutes)
    const nonceTime = Number(nonce);
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(currentTime - nonceTime) > fiveMinutes) {
      return NextResponse.json(
        { error: "Signature expired. Please try again." },
        { status: 401 }
      );
    }

    // Generate unique slug
    let slug = nanoid();
    let isUnique = false;
    let attempts = 0;

    // Ensure slug is unique (very unlikely to collide, but good practice)
    while (!isUnique && attempts < 5) {
      const existing = await Listing.findOne({ slug });
      if (!existing) {
        isUnique = true;
      } else {
        slug = nanoid();
        attempts++;
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: "Failed to generate unique slug" },
        { status: 500 }
      );
    }

    // Create listing
    const listingData = {
      slug,
      inviteUrl,
      priceUsdc,
      sellerAddress: sellerAddress.toLowerCase(),
      status: "active" as const,
      chainId,
      ...(appId && appId.trim() ? { appId: appId.trim() } : {}),
      ...(appName && appName.trim() ? { appName: appName.trim() } : {}),
    };

    const listing = await Listing.create(listingData);

    return NextResponse.json(
      {
        success: true,
        listing: {
          slug: listing.slug,
          // inviteUrl intentionally omitted for security
          priceUsdc: listing.priceUsdc,
          sellerAddress: listing.sellerAddress,
          status: listing.status,
          appId: listing.appId,
          appName: listing.appName,
          createdAt: listing.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating listing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

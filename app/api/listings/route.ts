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
import { getAppIconInfo } from "@/lib/url";
import { chainId } from "@/lib/chain";
import { sendNewListingNotification } from "@/lib/discord";

// Create a custom nanoid with URL-safe characters
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export async function GET() {
  try {
    await connectDB();

    const listings = await Listing.find({ chainId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      listings: listings.map((listing) => {
        const iconInfo = getAppIconInfo(listing);
        return {
          slug: listing.slug,
          listingType: listing.listingType || "invite_link",
          priceUsdc: listing.priceUsdc,
          sellerAddress: listing.sellerAddress,
          status: listing.status,
          appId: listing.appId,
          appName: listing.appName,
          // appUrl is public for access_code type
          appUrl:
            listing.listingType === "access_code" ? listing.appUrl : undefined,
          appIconUrl: iconInfo.url,
          iconNeedsDarkBg: iconInfo.needsDarkBg || false,
          // Multi-use listing fields (with backward compatibility defaults)
          maxUses: listing.maxUses ?? 1,
          purchaseCount: listing.purchaseCount ?? 0,
          description: listing.description,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
        };
      }),
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
      listingType = "invite_link",
      inviteUrl,
      appUrl,
      accessCode,
      priceUsdc,
      sellerAddress,
      nonce,
      chainId: clientChainId,
      signature,
      appId,
      appName,
      maxUses = 1, // Default to 1 for single-use listings
      description,
    } = body;

    // Debug logging
    console.log("Received data:", { listingType, appId, appName, maxUses });

    // Validate listing type
    if (listingType !== "invite_link" && listingType !== "access_code") {
      return NextResponse.json(
        {
          error: "Invalid listing type. Must be 'invite_link' or 'access_code'",
        },
        { status: 400 }
      );
    }

    // Validate required fields based on listing type
    if (listingType === "invite_link") {
      if (!inviteUrl) {
        return NextResponse.json(
          { error: "Invite URL is required for invite link listings" },
          { status: 400 }
        );
      }
    } else if (listingType === "access_code") {
      if (!appUrl) {
        return NextResponse.json(
          { error: "App URL is required for access code listings" },
          { status: 400 }
        );
      }
      if (!accessCode) {
        return NextResponse.json(
          { error: "Access code is required for access code listings" },
          { status: 400 }
        );
      }
    }

    // Validate common required fields
    if (
      !priceUsdc ||
      !sellerAddress ||
      !nonce ||
      !clientChainId ||
      !signature
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: priceUsdc, sellerAddress, nonce, chainId, signature",
        },
        { status: 400 }
      );
    }

    // Validate that the client's chainId matches the server's expected chainId
    if (clientChainId !== chainId) {
      return NextResponse.json(
        {
          error: `Invalid chain. Expected chainId ${chainId}, got ${clientChainId}. Please switch to the correct network.`,
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

    // Validate maxUses
    const parsedMaxUses =
      typeof maxUses === "number" ? maxUses : parseInt(maxUses, 10);
    if (isNaN(parsedMaxUses) || parsedMaxUses < -1 || parsedMaxUses === 0) {
      return NextResponse.json(
        { error: "maxUses must be -1 (unlimited) or a positive number" },
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
      listingType,
      inviteUrl: inviteUrl || "",
      appUrl: appUrl || "",
      accessCode: accessCode || "",
      priceUsdc: priceUsdc.toString(),
      sellerAddress: sellerAddress as `0x${string}`,
      appId: appId || "",
      appName: appName || "",
      maxUses: parsedMaxUses.toString(),
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
      listingType,
      priceUsdc,
      sellerAddress: sellerAddress.toLowerCase(),
      status: "active" as const,
      chainId,
      maxUses: parsedMaxUses,
      purchaseCount: 0,
      ...(listingType === "invite_link" ? { inviteUrl } : {}),
      ...(listingType === "access_code" ? { appUrl, accessCode } : {}),
      ...(appId && appId.trim() ? { appId: appId.trim() } : {}),
      ...(appName && appName.trim() ? { appName: appName.trim() } : {}),
      ...(description && description.trim() ? { description: description.trim() } : {}),
    };

    const listing = await Listing.create(listingData);

    // Send Discord notification (fire-and-forget, won't block response)
    // NOTE: Only safe, public data is passed - inviteUrl and accessCode are intentionally excluded
    sendNewListingNotification(
      {
        slug: listing.slug,
        listingType: listing.listingType || "invite_link",
        appName: listing.appName,
        appId: listing.appId,
        appUrl:
          listing.listingType === "access_code" ? listing.appUrl : undefined,
        priceUsdc: listing.priceUsdc,
        sellerAddress: listing.sellerAddress,
        maxUses: listing.maxUses ?? 1,
      },
      chainId
    );

    const createdListingIconInfo = getAppIconInfo({
      appId: listing.appId,
      appName: listing.appName,
      inviteUrl: listing.inviteUrl,
      appUrl: listing.appUrl,
      listingType: listing.listingType,
    });

    return NextResponse.json(
      {
        success: true,
        listing: {
          slug: listing.slug,
          listingType: listing.listingType,
          // inviteUrl and accessCode intentionally omitted for security
          // appUrl is public for access_code type
          appUrl:
            listing.listingType === "access_code" ? listing.appUrl : undefined,
          priceUsdc: listing.priceUsdc,
          sellerAddress: listing.sellerAddress,
          status: listing.status,
          appId: listing.appId,
          appName: listing.appName,
          appIconUrl: createdListingIconInfo.url,
          iconNeedsDarkBg: createdListingIconInfo.needsDarkBg || false,
          maxUses: listing.maxUses,
          purchaseCount: listing.purchaseCount,
          description: listing.description,
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

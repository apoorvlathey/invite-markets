import { NextRequest, NextResponse } from "next/server";
import {
  getListingBySlug,
  incrementPurchaseCount,
  isListingAvailable,
} from "@/lib/listing";
import { createThirdwebClient } from "thirdweb";
import { facilitator, settlePayment } from "thirdweb/x402";
import { base, baseSepolia } from "thirdweb/chains";
import { Transaction } from "@/models/transaction";
import { chainId, isTestnet } from "@/lib/chain";

const network = isTestnet ? baseSepolia : base;

const client = createThirdwebClient({
  secretKey: process.env.SECRET_KEY!,
});

const twFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.SERVER_WALLET!,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const listing = await getListingBySlug(slug, true);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Check if listing is available for purchase (considers multi-use inventory)
  if (!isListingAvailable(listing)) {
    return NextResponse.json(
      { error: "Listing not available" },
      { status: 410 } // 410 Gone - listing is sold out
    );
  }

  const paymentData = req.headers.get("x-payment");

  const result = await settlePayment({
    resourceUrl: req.nextUrl.href,
    method: "POST",
    paymentData,
    payTo: listing.sellerAddress,
    network,
    price: `${listing.priceUsdc} USDC`,
    facilitator: twFacilitator,
  });

  if (result.status !== 200) {
    return new NextResponse(JSON.stringify(result.responseBody), {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  try {
    await Transaction.create({
      listingSlug: slug,
      sellerAddress: listing.sellerAddress,
      buyerAddress: result.paymentReceipt.payer?.toLowerCase(),
      priceUsdc: listing.priceUsdc,
      appId: listing.appId,
      chainId,
    });
  } catch (error) {
    console.error("Failed to create transaction record:", error);
  }

  // Increment purchase count (and mark as sold if all uses consumed)
  await incrementPurchaseCount(slug);

  // Return appropriate data based on listing type
  const listingType = listing.listingType || "invite_link";

  if (listingType === "access_code") {
    return NextResponse.json({
      listingType: "access_code",
      appUrl: listing.appUrl,
      accessCode: listing.accessCode,
    });
  }

  // Default: invite_link type
  return NextResponse.json({
    listingType: "invite_link",
    inviteUrl: listing.inviteUrl,
  });
}

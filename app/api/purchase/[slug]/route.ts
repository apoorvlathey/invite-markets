import { NextRequest, NextResponse } from "next/server";
import { getListingBySlug } from "@/lib/listing";
import { createThirdwebClient } from "thirdweb";
import { facilitator, settlePayment } from "thirdweb/x402";
import { baseSepolia } from "thirdweb/chains";

const client = createThirdwebClient({
  secretKey: process.env.SECRET_KEY 
});

const twFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.SERVER_WALLET, 
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {

  const { slug } = await params;

  const listing = await getListingBySlug(slug, true);

  if (!listing || listing.status !== "active") {
    return NextResponse.json(
      { error: "Listing not available" },
      { status: 404 }
    );
  }

  const paymentData = req.headers.get("x-payment");

  const result = await settlePayment({
    resourceUrl: req.nextUrl.href,
    method: "POST",
    paymentData,
    payTo: listing.sellerAddress,
    network: baseSepolia,
    price: `${listing.priceUsdc} USDC`,
    facilitator: twFacilitator,
  });

  if (result.status !== 200) {
    return new NextResponse(
      JSON.stringify(result.responseBody),
      {
        status: result.status,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // todo - mark listing as sold and remove from the homepage

  console.log("purchased", listing.inviteUrl)
  return NextResponse.json({
    inviteUrl: listing.inviteUrl,
  });
}

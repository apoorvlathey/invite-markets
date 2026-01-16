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
import { sendPurchaseNotification } from "@/lib/discord";

const network = isTestnet ? baseSepolia : base;

const client = createThirdwebClient({
  secretKey: process.env.SECRET_KEY!,
});

// Create base facilitator
const baseFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.SERVER_WALLET!,
  // Don't wait for full on-chain confirmation to avoid Vercel timeout
  // "simulated" returns as soon as tx is in mempool (fast & reliable)
  waitUntil: "simulated",
});

// Patched facilitator that adds x402Version to paymentRequirements
// This is a workaround for a bug in thirdweb SDK where x402Version is not
// included in paymentRequirements when calling the /settle endpoint
const twFacilitator = {
  ...baseFacilitator,
  // Override settle to add x402Version to paymentRequirements
  settle: async (
    payload: Parameters<typeof baseFacilitator.settle>[0],
    paymentRequirements: Parameters<typeof baseFacilitator.settle>[1],
    waitUntil?: Parameters<typeof baseFacilitator.settle>[2]
  ) => {
    // Add x402Version to paymentRequirements if missing
    const patchedPaymentRequirements = {
      ...paymentRequirements,
      x402Version: payload.x402Version ?? 2, // Use payload's version or default to 2
    };
    
    console.log(`[x402 DEBUG] Patching paymentRequirements with x402Version:`, payload.x402Version ?? 2);
    
    return baseFacilitator.settle(payload, patchedPaymentRequirements, waitUntil);
  },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Log all relevant headers for debugging x402
  const relevantHeaders = {
    "x-payment": req.headers.get("x-payment"),
    "payment-signature": req.headers.get("payment-signature"),
    "payment-response": req.headers.get("payment-response"),
    "content-type": req.headers.get("content-type"),
  };
  console.log(`[x402 DEBUG] Slug: ${slug}`);
  console.log(`[x402 DEBUG] Request headers:`, JSON.stringify(relevantHeaders, null, 2));

  const listing = await getListingBySlug(slug, true);

  if (!listing) {
    console.log(`[x402 DEBUG] Listing not found for slug: ${slug}`);
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  console.log(`[x402 DEBUG] Listing found:`, {
    appName: listing.appName,
    priceUsdc: listing.priceUsdc,
    sellerAddress: listing.sellerAddress,
  });

  // Check if listing is available for purchase (considers multi-use inventory)
  if (!isListingAvailable(listing)) {
    console.log(`[x402 DEBUG] Listing not available (sold out)`);
    return NextResponse.json(
      { error: "Listing not available" },
      { status: 410 } // 410 Gone - listing is sold out
    );
  }

  // Support both x402 v1 (x-payment) and v2 (payment-signature) headers
  const paymentDataV1 = req.headers.get("x-payment");
  const paymentDataV2 = req.headers.get("payment-signature");
  const paymentData = paymentDataV2 || paymentDataV1;
  
  // Determine which x402 version is being used based on headers
  const x402Version = paymentDataV2 ? 2 : 1;
  
  console.log(`[x402 DEBUG] Payment data present:`, {
    hasV1Header: !!paymentDataV1,
    hasV2Header: !!paymentDataV2,
    detectedVersion: x402Version,
    paymentDataLength: paymentData?.length ?? 0,
    paymentDataPreview: paymentData ? paymentData.substring(0, 100) + '...' : null,
  });

  console.log(`[x402 DEBUG] Calling settlePayment with:`, {
    resourceUrl: req.nextUrl.href,
    method: "POST",
    payTo: listing.sellerAddress,
    network: network.id,
    price: `${listing.priceUsdc} USDC`,
    x402Version,
  });

  let result;
  try {
    result = await settlePayment({
      resourceUrl: req.nextUrl.href,
      method: "POST",
      paymentData,
      payTo: listing.sellerAddress,
      network,
      price: `${listing.priceUsdc} USDC`,
      facilitator: twFacilitator,
      x402Version,
    });
  } catch (settleError) {
    console.error(`[x402 ERROR] settlePayment threw an exception:`, settleError);
    console.error(`[x402 ERROR] Exception details:`, {
      name: settleError instanceof Error ? settleError.name : 'Unknown',
      message: settleError instanceof Error ? settleError.message : String(settleError),
      stack: settleError instanceof Error ? settleError.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: "Payment processing error", 
        details: settleError instanceof Error ? settleError.message : String(settleError)
      },
      { status: 500 }
    );
  }

  // Log the FULL result object to understand its structure
  console.log(`[x402 DEBUG] settlePayment FULL result:`, JSON.stringify(result, null, 2));
  console.log(`[x402 DEBUG] settlePayment result keys:`, Object.keys(result));

  if (result.status !== 200) {
    console.error(`[x402 ERROR] Payment settlement failed:`, {
      status: result.status,
      responseBody: result.responseBody,
      responseHeaders: result.responseHeaders,
      // Log all properties of result
      allKeys: Object.keys(result),
    });
    
    // Create response with proper headers from settlePayment
    const response = new NextResponse(JSON.stringify(result.responseBody), {
      status: result.status,
    });
    
    // Forward headers from settlePayment result
    if (result.responseHeaders && typeof result.responseHeaders === 'object') {
      Object.entries(result.responseHeaders).forEach(([key, value]) => {
        if (typeof value === 'string') {
          response.headers.set(key, value);
        }
      });
    }
    
    // Ensure content-type is set
    if (!response.headers.has("Content-Type")) {
      response.headers.set("Content-Type", "application/json");
    }
    
    return response;
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

  // Send Discord notification (fire-and-forget, won't block response)
  // NOTE: Only safe, public data is passed - inviteUrl and accessCode are intentionally excluded
  sendPurchaseNotification(
    {
      slug,
      appName: listing.appName,
      appId: listing.appId,
      priceUsdc: listing.priceUsdc,
      sellerAddress: listing.sellerAddress,
      buyerAddress: result.paymentReceipt.payer?.toLowerCase() ?? "Unknown",
    },
    chainId
  );

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

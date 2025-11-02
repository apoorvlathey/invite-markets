import { NextRequest, NextResponse } from "next/server";

/**
 * Random Number Generation API
 *
 * Protected by x402 middleware (configured in middleware.ts)
 * Requires 0.01 USDC payment on Base or Base Sepolia before access
 */
export async function GET(req: NextRequest) {
  try {
    // Get optional parameters from query
    const { searchParams } = new URL(req.url);
    const min = parseInt(searchParams.get("min") || "1");
    const max = parseInt(searchParams.get("max") || "100");

    // Validate parameters
    if (min >= max) {
      return NextResponse.json(
        { error: "min must be less than max" },
        { status: 400 }
      );
    }

    if (min < 0 || max < 0) {
      return NextResponse.json(
        { error: "min and max must be positive numbers" },
        { status: 400 }
      );
    }

    // Generate random number in the specified range
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

    return NextResponse.json({
      success: true,
      randomNumber,
      range: { min, max },
      timestamp: new Date().toISOString(),
      cost: "0.01 USDC",
      network: process.env.X402_NETWORK || "base-sepolia",
    });
  } catch (error) {
    console.error("Error generating random number:", error);
    return NextResponse.json(
      { error: "Failed to generate random number" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

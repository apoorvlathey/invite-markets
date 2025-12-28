import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

const ADMIN_ETH_ADDRESSES = (process.env.ADMIN_ETH_ADDRESSES || "")
  .split(",")
  .map((addr) => addr.trim().toLowerCase())
  .filter(Boolean);

// POST - Verify SIWE signature for admin access
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, message, signature } = body;

    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: "Address, message, and signature are required" },
        { status: 400 }
      );
    }

    // Check if address is in admin list
    if (!ADMIN_ETH_ADDRESSES.includes(address.toLowerCase())) {
      return NextResponse.json(
        { error: "Address is not authorized as admin" },
        { status: 403 }
      );
    }

    // Verify the signature
    try {
      const isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Check if message timestamp is recent (within 5 minutes, not in the future)
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (timestampMatch) {
      const messageTimestamp = parseInt(timestampMatch[1]);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      // Reject future timestamps (with small grace period for clock skew)
      if (messageTimestamp > now + 30000) {
        return NextResponse.json(
          { error: "Invalid timestamp" },
          { status: 401 }
        );
      }
      
      // Reject timestamps older than 5 minutes
      if (now - messageTimestamp > fiveMinutes) {
        return NextResponse.json(
          { error: "Signature expired. Please sign again." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      address: address.toLowerCase(),
    });
  } catch (error) {
    console.error("Error verifying admin signature:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


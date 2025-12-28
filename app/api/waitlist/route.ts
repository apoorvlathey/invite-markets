import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Waitlist } from "@/models/waitlist";
import { verifyMessage } from "viem";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const ADMIN_ETH_ADDRESSES = (process.env.ADMIN_ETH_ADDRESSES || "")
  .split(",")
  .map((addr) => addr.trim().toLowerCase())
  .filter(Boolean);

// Verify Cloudflare Turnstile token
async function verifyTurnstile(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) {
    console.warn("TURNSTILE_SECRET_KEY not set, skipping verification");
    return true;
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}

// POST - Submit waitlist entry
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, xUsername, turnstileToken } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Verify Turnstile token
    if (!turnstileToken) {
      return NextResponse.json(
        { error: "Captcha verification required" },
        { status: 400 }
      );
    }

    const isTurnstileValid = await verifyTurnstile(turnstileToken);
    if (!isTurnstileValid) {
      return NextResponse.json(
        { error: "Captcha verification failed" },
        { status: 400 }
      );
    }

    // Get IP address for spam detection
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") || "unknown";

    // Clean X username (remove @ if present)
    const cleanXUsername = xUsername?.replace(/^@/, "").trim() || undefined;

    // Check if email already exists
    const existingEntry = await Waitlist.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingEntry) {
      return NextResponse.json(
        { error: "This email is already on the waitlist" },
        { status: 409 }
      );
    }

    // Create waitlist entry
    const entry = await Waitlist.create({
      email: email.toLowerCase().trim(),
      xUsername: cleanXUsername,
      ipAddress,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Successfully joined the waitlist!",
        entry: {
          email: entry.email,
          xUsername: entry.xUsername,
          createdAt: entry.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating waitlist entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Fetch all waitlist entries (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify admin signature
    const signature = request.headers.get("x-admin-signature");
    const encodedMessage = request.headers.get("x-admin-message");
    const address = request.headers.get("x-admin-address");

    if (!signature || !encodedMessage || !address) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Decode the base64 message
    const message = Buffer.from(encodedMessage, "base64").toString("utf-8");

    // Verify the address is an admin
    if (!ADMIN_ETH_ADDRESSES.includes(address.toLowerCase())) {
      return NextResponse.json(
        { error: "Unauthorized: Not an admin address" },
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

      // Check if message is recent (within 5 minutes)
      const timestampMatch = message.match(/Timestamp: (\d+)/);
      if (timestampMatch) {
        const messageTimestamp = parseInt(timestampMatch[1]);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (Math.abs(now - messageTimestamp) > fiveMinutes) {
          return NextResponse.json(
            { error: "Signature expired" },
            { status: 401 }
          );
        }
      }
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    await connectDB();

    const entries = await Waitlist.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      entries: entries.map((entry) => ({
        email: entry.email,
        xUsername: entry.xUsername,
        createdAt: entry.createdAt,
      })),
      total: entries.length,
    });
  } catch (error) {
    console.error("Error fetching waitlist entries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


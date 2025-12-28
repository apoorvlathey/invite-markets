import { NextRequest, NextResponse } from "next/server";
import { createAccessToken } from "@/lib/access-token";

const INVITE_ACCESS_CODE = process.env.INVITE_ACCESS_CODE;

// POST - Validate invite code and set cookie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Access code is required" },
        { status: 400 }
      );
    }

    if (!INVITE_ACCESS_CODE) {
      return NextResponse.json(
        { error: "Server not configured for invite access" },
        { status: 500 }
      );
    }

    // Verify the code matches
    if (code !== INVITE_ACCESS_CODE) {
      return NextResponse.json(
        { error: "Invalid access code" },
        { status: 401 }
      );
    }

    // Create signed access token
    const accessToken = createAccessToken();

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: "Access granted!",
    });

    // Set httpOnly cookie that expires in 1 year
    response.cookies.set("invite_access", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error verifying invite code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

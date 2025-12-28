import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/app/api/invite/verify/route";

// GET - Check if user has valid access cookie
export async function GET(request: NextRequest) {
  try {
    const isWhitelistMode = process.env.NEXT_PUBLIC_IS_ONLY_WHITELIST === "true";
    
    // If not in whitelist mode, everyone has access
    if (!isWhitelistMode) {
      return NextResponse.json({
        hasAccess: true,
        isWhitelistMode: false,
      });
    }

    // Check for access cookie
    const accessCookie = request.cookies.get("invite_access");
    
    if (!accessCookie?.value) {
      return NextResponse.json({
        hasAccess: false,
        isWhitelistMode: true,
      });
    }

    // Verify the cookie token
    const isValid = verifyAccessToken(accessCookie.value);

    return NextResponse.json({
      hasAccess: isValid,
      isWhitelistMode: true,
    });
  } catch (error) {
    console.error("Error checking access:", error);
    return NextResponse.json({
      hasAccess: false,
      isWhitelistMode: true,
      error: "Error checking access",
    });
  }
}


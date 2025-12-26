import { ImageResponse } from "next/og";
import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";
import { featuredApps } from "@/data/featuredApps";
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OGBackground,
  OGBottomAccent,
} from "@/lib/og-image";

// Gradient colors for apps (same as in listings.ts)
const GRADIENTS = [
  { from: "#6366f1", to: "#8b5cf6" },
  { from: "#06b6d4", to: "#3b82f6" },
  { from: "#10b981", to: "#06b6d4" },
  { from: "#f59e0b", to: "#ef4444" },
  { from: "#ec4899", to: "#8b5cf6" },
  { from: "#f43f5e", to: "#fb923c" },
  { from: "#8b5cf6", to: "#06b6d4" },
  { from: "#84cc16", to: "#22c55e" },
];

function hashString(str: string): number {
  let hash = 0;
  const normalizedStr = str.toLowerCase().trim();
  for (let i = 0; i < normalizedStr.length; i++) {
    const char = normalizedStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getGradientForApp(appName: string): { from: string; to: string } {
  const hash = hashString(appName);
  return GRADIENTS[hash % GRADIENTS.length];
}

// Image metadata
export const alt = "App on invite.markets";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Get app data and listing count
async function getAppData(slug: string) {
  await connectDB();

  // Check if this is a featured app
  const featuredApp = featuredApps.find((a) => a.id === slug);

  // Get listings for this app
  const listings = await Listing.find({
    $or: [{ appId: slug }, { appName: slug }],
    status: "active",
  }).lean();

  const listingCount = listings.length;

  // For non-featured apps, get app info from first listing
  let appName = slug;
  let appIconUrl: string | null = null;

  if (featuredApp) {
    appName = featuredApp.appName;
    appIconUrl = featuredApp.appIconUrl;
  } else if (listings.length > 0) {
    const firstListing = listings[0] as {
      appName?: string;
      appIconUrl?: string;
    };
    appName = firstListing.appName || slug;
    appIconUrl = firstListing.appIconUrl || null;
  }

  // Get cheapest price
  let cheapestPrice: number | null = null;
  if (listings.length > 0) {
    const prices = listings.map((l) => (l as { priceUsdc: number }).priceUsdc);
    cheapestPrice = Math.min(...prices);
  }

  return {
    appName,
    appIconUrl,
    listingCount,
    cheapestPrice,
    isFeatured: !!featuredApp,
  };
}

// Image generation
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const appData = await getAppData(slug);
  const gradient = getGradientForApp(appData.appName);

  // If no featured app and no listings, show basic OG
  if (!appData.isFeatured && appData.listingCount === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#000000",
            position: "relative",
          }}
        >
          <OGBackground />
          <div
            style={{
              display: "flex",
              fontSize: "72px",
              fontWeight: 800,
              zIndex: "10",
            }}
          >
            <span style={{ color: "#ffffff" }}>invite</span>
            <span
              style={{
                background: "linear-gradient(135deg, #06b6d4, #a855f7)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              .markets
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "24px",
              fontSize: "32px",
              color: "#71717a",
              zIndex: "10",
            }}
          >
            App not found
          </div>
          <OGBottomAccent />
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#000000",
          position: "relative",
          padding: "48px 56px",
        }}
      >
        <OGBackground />

        {/* Top row - badges */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: "10",
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            {/* Featured badge */}
            {appData.isFeatured && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "9999px",
                  background: "rgba(6, 182, 212, 0.2)",
                  border: "1px solid rgba(6, 182, 212, 0.4)",
                }}
              >
                <span
                  style={{
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#22d3ee",
                  }}
                >
                  ⭐ Featured App
                </span>
              </div>
            )}

            {/* Listings count badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 22px",
                borderRadius: "9999px",
                background:
                  appData.listingCount > 0
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(113, 113, 122, 0.2)",
                border: `1px solid ${
                  appData.listingCount > 0
                    ? "rgba(16, 185, 129, 0.4)"
                    : "rgba(113, 113, 122, 0.4)"
                }`,
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: appData.listingCount > 0 ? "#34d399" : "#a1a1aa",
                  boxShadow:
                    appData.listingCount > 0
                      ? "0 0 10px rgba(52, 211, 153, 0.5)"
                      : "none",
                }}
              />
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: appData.listingCount > 0 ? "#34d399" : "#a1a1aa",
                }}
              >
                {appData.listingCount > 0
                  ? `${appData.listingCount} listing${
                      appData.listingCount > 1 ? "s" : ""
                    } available`
                  : "No listings yet"}
              </span>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            zIndex: "10",
          }}
        >
          {/* App icon */}
          {appData.appIconUrl ? (
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "28px",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
                border: "3px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.7)",
              }}
            >
              <img
                src={
                  appData.appIconUrl.startsWith("/")
                    ? `https://invite.markets${appData.appIconUrl}`
                    : appData.appIconUrl
                }
                alt={appData.appName}
                width={100}
                height={100}
                style={{ objectFit: "contain" }}
              />
            </div>
          ) : (
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "28px",
                background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
                fontSize: "60px",
                fontWeight: 700,
                color: "#ffffff",
                border: "3px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.7)",
              }}
            >
              {appData.appName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* App name */}
          <div
            style={{
              display: "flex",
              fontSize: "68px",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "#ffffff",
              marginBottom: appData.listingCount > 0 ? "28px" : "20px",
            }}
          >
            {appData.appName}
          </div>

          {/* Price box with label - only if listings exist */}
          {appData.listingCount > 0 && appData.cheapestPrice !== null ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                padding: "14px 32px 18px",
                borderRadius: "16px",
                background: "rgba(24, 24, 27, 0.95)",
                border: "1px solid rgba(63, 63, 70, 0.7)",
                boxShadow: "0 8px 32px -8px rgba(0, 0, 0, 0.4)",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#d4d4d8",
                  letterSpacing: "0.02em",
                }}
              >
                Cheapest invite available
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <img
                  src="https://invite.markets/images/usdc.svg"
                  alt="USDC"
                  width={38}
                  height={38}
                />
                <span
                  style={{
                    fontSize: "48px",
                    fontWeight: 800,
                    background: "linear-gradient(90deg, #06b6d4, #3b82f6)",
                    backgroundClip: "text",
                    color: "transparent",
                    letterSpacing: "-0.02em",
                  }}
                >
                  ${appData.cheapestPrice}
                </span>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: 500,
                    color: "#d4d4d8",
                  }}
                >
                  USDC
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                color: "#71717a",
              }}
            >
              Early access invites
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: "10",
          }}
        >
          {/* Info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 18px",
              borderRadius: "12px",
              background: "rgba(24, 24, 27, 0.85)",
              border: "1px solid rgba(63, 63, 70, 0.5)",
            }}
          >
            <span
              style={{ fontSize: "16px", color: "#71717a", fontWeight: 400 }}
            >
              Early access invites marketplace
            </span>
          </div>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: "46px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#ffffff",
              }}
            >
              invite
            </span>
            <span
              style={{
                fontSize: "46px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                background: "linear-gradient(135deg, #06b6d4, #a855f7)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              .markets
            </span>
          </div>
        </div>

        <OGBottomAccent />
      </div>
    ),
    { ...size }
  );
}

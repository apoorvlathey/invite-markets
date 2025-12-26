import { ImageResponse } from "next/og";
import { getListingBySlug } from "@/lib/listing";
import {
  getResolvedAddressFromCache,
  formatSellerForOG,
} from "@/lib/resolve-address-server";
import { timeAgo } from "@/lib/time";
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
export const alt = "Listing on invite.markets";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Image generation
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug, false);

  if (!listing) {
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
            Listing not found
          </div>
          <OGBottomAccent />
        </div>
      ),
      { ...size }
    );
  }

  const app = listing.appId
    ? featuredApps.find((a) => a.id === listing.appId)
    : null;
  const appName = app?.appName ?? listing.appName ?? "Invite";
  const appIconUrl = listing.appIconUrl;
  const gradient = getGradientForApp(appName);
  const isFeatured = !!app;
  const resolvedAddress = await getResolvedAddressFromCache(
    listing.sellerAddress
  );
  const sellerInfo = formatSellerForOG(listing.sellerAddress, resolvedAddress);
  const listedTime = timeAgo(listing.createdAt);

  const statusConfig = {
    active: {
      bg: "rgba(16, 185, 129, 0.2)",
      border: "rgba(16, 185, 129, 0.4)",
      text: "#34d399",
      dot: "#34d399",
      label: "Available",
    },
    sold: {
      bg: "rgba(113, 113, 122, 0.2)",
      border: "rgba(113, 113, 122, 0.4)",
      text: "#a1a1aa",
      dot: "#a1a1aa",
      label: "Sold",
    },
    cancelled: {
      bg: "rgba(239, 68, 68, 0.2)",
      border: "rgba(239, 68, 68, 0.4)",
      text: "#f87171",
      dot: "#f87171",
      label: "Cancelled",
    },
  };
  const status = statusConfig[listing.status] || statusConfig.active;

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

        {/* Top row - status badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            zIndex: "10",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 22px",
              borderRadius: "9999px",
              background: status.bg,
              border: `1px solid ${status.border}`,
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: status.dot,
                boxShadow: `0 0 10px ${status.dot}80`,
              }}
            />
            <span
              style={{ fontSize: "17px", fontWeight: 700, color: status.text }}
            >
              {status.label}
            </span>
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
          {appIconUrl ? (
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "28px",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "32px",
                border: "3px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.7)",
              }}
            >
              <img
                src={
                  appIconUrl.startsWith("/")
                    ? `https://invite.markets${appIconUrl}`
                    : appIconUrl
                }
                alt={appName}
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
                marginBottom: "32px",
                fontSize: "60px",
                fontWeight: 700,
                color: "#ffffff",
                border: "3px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.7)",
              }}
            >
              {appName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* App name row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                fontSize: "68px",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#ffffff",
              }}
            >
              {appName}
            </span>
            {isFeatured && (
              <div
                style={{
                  display: "flex",
                  padding: "8px 16px",
                  borderRadius: "10px",
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
                  ⭐ Featured
                </span>
              </div>
            )}
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "#71717a",
              marginBottom: "32px",
              fontWeight: 400,
            }}
          >
            Early access invite
          </div>

          {/* Price box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "18px 36px",
              borderRadius: "18px",
              background: "rgba(24, 24, 27, 0.95)",
              border: "1px solid rgba(63, 63, 70, 0.7)",
              boxShadow: "0 8px 32px -8px rgba(0, 0, 0, 0.4)",
            }}
          >
            <img
              src="https://invite.markets/images/usdc.svg"
              alt="USDC"
              width={44}
              height={44}
            />
            <span
              style={{
                fontSize: "56px",
                fontWeight: 800,
                background: "linear-gradient(90deg, #06b6d4, #3b82f6)",
                backgroundClip: "text",
                color: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              ${listing.priceUsdc}
            </span>
            <span
              style={{ fontSize: "28px", fontWeight: 500, color: "#52525b" }}
            >
              USDC
            </span>
          </div>
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
          {/* Info pills */}
          <div style={{ display: "flex", gap: "16px" }}>
            {/* Seller */}
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
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: sellerInfo.avatarUrl
                    ? "#27272a"
                    : `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {sellerInfo.avatarUrl && (
                  <img
                    src={sellerInfo.avatarUrl}
                    alt=""
                    width={24}
                    height={24}
                    style={{ objectFit: "cover" }}
                  />
                )}
              </div>
              <span
                style={{ fontSize: "15px", color: "#71717a", fontWeight: 400 }}
              >
                by
              </span>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: sellerInfo.hasResolution ? "#f4f4f5" : "#a1a1aa",
                }}
              >
                {sellerInfo.displayName}
              </span>
            </div>

            {/* Time */}
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
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
                }}
              />
              <span
                style={{ fontSize: "15px", color: "#71717a", fontWeight: 400 }}
              >
                Listed
              </span>
              <span
                style={{ fontSize: "16px", fontWeight: 600, color: "#e4e4e7" }}
              >
                {listedTime}
              </span>
            </div>
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

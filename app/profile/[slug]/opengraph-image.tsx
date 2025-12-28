import { ImageResponse } from "next/og";
import { blo } from "blo";
import {
  getResolvedAddressFromCache,
  formatSellerForOG,
} from "@/lib/resolve-address-server";
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OGBackground,
  OGBottomAccent,
} from "@/lib/og-image";

// Image metadata
export const alt = "Profile on invite.markets";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Image generation
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: address } = await params;

  // Validate address format
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/i.test(address);

  if (!isValidAddress) {
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
            Invalid profile address
          </div>
          <OGBottomAccent />
        </div>
      ),
      { ...size }
    );
  }

  const resolvedAddress = await getResolvedAddressFromCache(address);
  const profileInfo = formatSellerForOG(address, resolvedAddress);

  // Generate blockie avatar URL
  const bloAvatar = blo(address as `0x${string}`);

  // Resolution type display config
  const typeConfig: Record<
    string,
    { label: string; bg: string; border: string; text: string; icon: string }
  > = {
    farcaster: {
      label: "Farcaster",
      bg: "rgba(168, 85, 247, 0.2)",
      border: "rgba(168, 85, 247, 0.4)",
      text: "#c084fc",
      icon: "🟣",
    },
    basename: {
      label: "Base Name",
      bg: "rgba(59, 130, 246, 0.2)",
      border: "rgba(59, 130, 246, 0.4)",
      text: "#60a5fa",
      icon: "🔵",
    },
    ens: {
      label: "ENS",
      bg: "rgba(6, 182, 212, 0.2)",
      border: "rgba(6, 182, 212, 0.4)",
      text: "#22d3ee",
      icon: "🌐",
    },
  };

  const resolvedType = resolvedAddress?.resolvedType;
  const typeInfo = resolvedType ? typeConfig[resolvedType] : null;

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

        {/* Top row - identity badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            zIndex: "10",
          }}
        >
          {typeInfo ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 22px",
                borderRadius: "9999px",
                background: typeInfo.bg,
                border: `1px solid ${typeInfo.border}`,
              }}
            >
              <span style={{ fontSize: "17px" }}>{typeInfo.icon}</span>
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: typeInfo.text,
                }}
              >
                {typeInfo.label} Profile
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 22px",
                borderRadius: "9999px",
                background: "rgba(113, 113, 122, 0.2)",
                border: "1px solid rgba(113, 113, 122, 0.4)",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#a1a1aa",
                }}
              />
              <span
                style={{ fontSize: "17px", fontWeight: 700, color: "#a1a1aa" }}
              >
                Wallet Profile
              </span>
            </div>
          )}
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
          {/* Avatar */}
          {profileInfo.avatarUrl ? (
            <div
              style={{
                width: "140px",
                height: "140px",
                borderRadius: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "32px",
                border: "4px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.7)",
                overflow: "hidden",
              }}
            >
              <img
                src={profileInfo.avatarUrl}
                alt=""
                width={140}
                height={140}
                style={{ objectFit: "cover" }}
              />
            </div>
          ) : (
            <div
              style={{
                width: "140px",
                height: "140px",
                borderRadius: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "32px",
                border: "4px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.7)",
                overflow: "hidden",
              }}
            >
              <img
                src={bloAvatar}
                alt=""
                width={140}
                height={140}
                style={{ objectFit: "cover" }}
              />
            </div>
          )}

          {/* Display name */}
          <span
            style={{
              fontSize: "64px",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: profileInfo.hasResolution ? "#ffffff" : "#a1a1aa",
              marginBottom: "12px",
            }}
          >
            {profileInfo.displayName}
          </span>

          {/* Short address (if display name is different) */}
          {profileInfo.hasResolution && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 24px",
                borderRadius: "14px",
                background: "rgba(24, 24, 27, 0.85)",
                border: "1px solid rgba(63, 63, 70, 0.5)",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 500,
                  color: "#71717a",
                  fontFamily: "monospace",
                }}
              >
                {profileInfo.shortAddress}
              </span>
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
          {/* Info pill */}
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: "#71717a" }}
            >
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{ fontSize: "16px", color: "#71717a", fontWeight: 400 }}
            >
              User profile on invite.markets
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

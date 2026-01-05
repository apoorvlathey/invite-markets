import { ImageResponse } from "next/og";
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OGBackground,
  OGBottomAccent,
} from "@/lib/og-image";

// Image metadata
export const alt = "All Listings | invite.markets";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Image generation
export default async function Image() {
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
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <OGBackground />

        {/* Content container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Main branding - invite.markets */}
          <div
            style={{
              display: "flex",
              fontSize: "86px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "32px",
            }}
          >
            <span style={{ color: "#ffffff" }}>invite</span>
            <span
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              .markets
            </span>
          </div>

          {/* Page title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                fontSize: "48px",
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              Browse
            </span>
            <span
              style={{
                fontSize: "48px",
                fontWeight: 700,
                background: "linear-gradient(90deg, #06b6d4, #3b82f6)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              All Listings
            </span>
          </div>

          {/* Tagline */}
          <span
            style={{
              fontSize: "24px",
              color: "#a1a1aa",
              fontWeight: 400,
              marginBottom: "40px",
            }}
          >
            Discover and buy invite codes to the hottest web3 apps.
          </span>

          {/* Feature badges row */}
          <div
            style={{
              display: "flex",
              gap: "20px",
            }}
          >
            {/* Filter badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "12px",
                background: "rgba(6, 182, 212, 0.15)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
              }}
            >
              <span style={{ fontSize: "20px" }}>🔍</span>
              <span
                style={{ fontSize: "18px", color: "#22d3ee", fontWeight: 500 }}
              >
                Filter by App
              </span>
            </div>

            {/* Sort badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "12px",
                background: "rgba(39, 39, 42, 0.8)",
                border: "1px solid rgba(63, 63, 70, 0.8)",
              }}
            >
              <span style={{ fontSize: "20px" }}>📊</span>
              <span
                style={{ fontSize: "18px", color: "#e4e4e7", fontWeight: 500 }}
              >
                Sortable Table
              </span>
            </div>

            {/* Instant access badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "12px",
                background: "rgba(39, 39, 42, 0.8)",
                border: "1px solid rgba(63, 63, 70, 0.8)",
              }}
            >
              <span style={{ fontSize: "20px" }}>⚡</span>
              <span
                style={{ fontSize: "18px", color: "#e4e4e7", fontWeight: 500 }}
              >
                Instant Buy
              </span>
            </div>
          </div>
        </div>

        <OGBottomAccent />
      </div>
    ),
    {
      ...size,
    }
  );
}


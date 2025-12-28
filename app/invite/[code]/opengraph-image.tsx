import { ImageResponse } from "next/og";
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OGBackground,
  OGBottomAccent,
  ogContainerStyle,
} from "@/lib/og-image";

// Image metadata
export const alt = "invite.markets | Exclusive Access";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          ...ogContainerStyle,
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
            textAlign: "center",
            padding: "60px",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Exclusive Access badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 32px",
              borderRadius: "9999px",
              background: "rgba(6, 182, 212, 0.2)",
              border: "2px solid rgba(6, 182, 212, 0.4)",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#22d3ee",
                boxShadow: "0 0 15px rgba(34, 211, 238, 0.9)",
              }}
            />
            <span
              style={{
                fontSize: "28px",
                fontWeight: 600,
                color: "#22d3ee",
                letterSpacing: "0.02em",
              }}
            >
              Exclusive Access
            </span>
          </div>

          {/* Main title with gradient - BIG */}
          <div
            style={{
              display: "flex",
              fontSize: "120px",
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

          {/* Tagline */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "50px",
            }}
          >
            <span
              style={{
                fontSize: "36px",
                color: "#a1a1aa",
                fontWeight: 400,
              }}
            >
              The marketplace for
            </span>
            <span
              style={{
                fontSize: "36px",
                fontWeight: 700,
                background: "linear-gradient(90deg, #06b6d4, #3b82f6)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              early access
            </span>
            <span
              style={{
                fontSize: "36px",
                color: "#a1a1aa",
                fontWeight: 400,
              }}
            >
              to web3 apps
            </span>
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              gap: "16px",
            }}
          >
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
                Instant Access
              </span>
            </div>
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
              <span style={{ fontSize: "20px" }}>💰</span>
              <span
                style={{ fontSize: "18px", color: "#e4e4e7", fontWeight: 500 }}
              >
                USDC Payments
              </span>
            </div>
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
              <span style={{ fontSize: "20px" }}>🔒</span>
              <span
                style={{ fontSize: "18px", color: "#e4e4e7", fontWeight: 500 }}
              >
                Trusted Sellers
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


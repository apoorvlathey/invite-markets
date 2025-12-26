import { ImageResponse } from "next/og";
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OGBackground,
  OGBottomAccent,
  ogContainerStyle,
} from "@/lib/og-image";

// Image metadata
export const alt =
  "invite.markets | Buy & Sell Early Access to the Hottest Web3 Apps";
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
          {/* Powered by x402 badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "9999px",
              background: "rgba(6, 182, 212, 0.15)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#22d3ee",
                boxShadow: "0 0 10px rgba(34, 211, 238, 0.8)",
              }}
            />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 500,
                color: "#22d3ee",
              }}
            >
              Powered by x402
            </span>
          </div>

          {/* Main title with gradient */}
          <div
            style={{
              display: "flex",
              fontSize: "92px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "24px",
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
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "32px",
                  color: "#a1a1aa",
                  fontWeight: 400,
                }}
              >
                Buy and sell
              </span>
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#f0abfc",
                  textShadow:
                    "0 0 30px rgba(168, 85, 247, 0.8), 0 0 60px rgba(236, 72, 153, 0.5)",
                }}
              >
                early access
              </span>
              <span
                style={{
                  fontSize: "32px",
                  color: "#a1a1aa",
                  fontWeight: 400,
                }}
              >
                to the
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 600,
                  background: "linear-gradient(90deg, #06b6d4, #3b82f6)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                hottest web3 apps
              </span>
              <span
                style={{
                  fontSize: "32px",
                  color: "#a1a1aa",
                  fontWeight: 400,
                }}
              >
                — instantly.
              </span>
            </div>
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "50px",
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
              <span style={{ fontSize: "20px" }}>🔒</span>
              <span
                style={{ fontSize: "18px", color: "#e4e4e7", fontWeight: 500 }}
              >
                Ethos Ratings
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

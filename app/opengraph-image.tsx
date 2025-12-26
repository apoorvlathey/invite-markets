import { ImageResponse } from "next/og";

// Image metadata
export const alt =
  "invite.markets | Buy & Sell Early Access to the Hottest Web3 Apps";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

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
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient orbs background */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-150px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-200px",
            left: "30%",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
          }}
        />

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
                  textShadow: "0 0 30px rgba(168, 85, 247, 0.8), 0 0 60px rgba(236, 72, 153, 0.5)",
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

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #06b6d4, #3b82f6, #a855f7)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}

import { ImageResponse } from "next/og";

// Image metadata
export const alt = "x402 Random Number API - Payment-Gated API with PayAI";
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
          fontSize: 60,
          background: "linear-gradient(to bottom, #18181b, #000000)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: "bold",
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: 20,
            }}
          >
            x402 Random Number API
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#a1a1aa",
              marginBottom: 40,
            }}
          >
            Generate random numbers with x402 payment protocol
          </div>
          <div
            style={{
              display: "flex",
              gap: 30,
              fontSize: 28,
              color: "#e4e4e7",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>💰</span>
              <span>0.01 USDC per request</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>⚡</span>
              <span>Base Network</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              fontSize: 24,
              color: "#71717a",
              marginTop: 30,
            }}
          >
            <span>PayAI Facilitator</span>
            <span>•</span>
            <span>No API Keys Required</span>
            <span>•</span>
            <span>0.01 USDC</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

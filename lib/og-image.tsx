/**
 * Shared utilities and components for OpenGraph images.
 * These are reusable styles and elements used across all OG images.
 */

// ============================================================================
// SHARED STYLES & CONSTANTS
// ============================================================================

export const OG_SIZE = {
  width: 1200,
  height: 630,
};

export const OG_CONTENT_TYPE = "image/png";

// ============================================================================
// SHARED COMPONENTS (as inline styles for @vercel/og)
// ============================================================================

/**
 * Black background with gradient orbs effect
 */
export function OGBackground() {
  return (
    <>
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
    </>
  );
}

/**
 * Bottom accent gradient line
 */
export function OGBottomAccent() {
  return (
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
  );
}

/**
 * Site branding badge
 */
export function OGSiteBrand({
  size = "normal",
}: {
  size?: "normal" | "small";
}) {
  const fontSize = size === "small" ? "24px" : "32px";

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span style={{ color: "#ffffff", fontSize, fontWeight: 700 }}>
        invite
      </span>
      <span
        style={{
          background: "linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)",
          backgroundClip: "text",
          color: "transparent",
          fontSize,
          fontWeight: 700,
        }}
      >
        .markets
      </span>
    </div>
  );
}

/**
 * Powered by x402 badge
 */
export function OGPoweredByBadge() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 20px",
        borderRadius: "9999px",
        background: "rgba(6, 182, 212, 0.15)",
        border: "1px solid rgba(6, 182, 212, 0.3)",
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
          fontSize: "16px",
          fontWeight: 500,
          color: "#22d3ee",
        }}
      >
        Powered by x402
      </span>
    </div>
  );
}

/**
 * Container styles for the main OG image wrapper
 */
export const ogContainerStyle = {
  width: "100%",
  height: "100%",
  display: "flex" as const,
  flexDirection: "column" as const,
  background: "#000000",
  position: "relative" as const,
  overflow: "hidden" as const,
};

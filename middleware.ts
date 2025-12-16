import { paymentMiddleware } from "x402-next"; // https://github.com/coinbase/x402/tree/main/typescript/packages/x402-next
import { payai } from "facilitators"; // https://github.com/Merit-Systems/x402scan/tree/main/packages/facilitators

/**
 * x402 Payment Middleware Configuration
 *
 * Protects API endpoints and requires payment before access
 * - Uses PayAI facilitator (no API keys required!)
 * - Supports BASE and SOLANA networks
 * - Includes resource discovery support
 * - AI-payment infrastructure from x402scan
 */
export const middleware = paymentMiddleware(
  (process.env.X402_WALLET_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  {
    // Protect the random number API endpoint
    // if POST is not specified, then GET endpoint also gets generated.
    "POST /api/random": {
      price: "$0.01", // 0.01 USDC per request
      network:
        (process.env.X402_NETWORK as "base" | "base-sepolia") || "base-sepolia", // base or base-sepolia
      config: {
        description:
          "Random Number Generation Service - Returns a random number within the specified range",
        mimeType: "application/json",
        maxTimeoutSeconds: 60,
        discoverable: true,
        inputSchema: {
          bodyType: "json",
          bodyFields: {
            min: {
              type: "number",
              description: "Minimum value for random number (default: 1)",
              default: 1,
            },
            max: {
              type: "number",
              description: "Maximum value for random number (default: 100)",
              default: 100,
            },
          },
        },
        outputSchema: {
          type: "object",
          description: "Random number generation result",
          properties: {
            success: { type: "boolean" },
            randomNumber: { type: "number" },
            range: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" },
              },
            },
            timestamp: { type: "string", format: "date-time" },
            cost: { type: "string" },
            network: { type: "string" },
          },
        },
      },
    },
  },
  // Use PayAI facilitator from the 'facilitators' package
  // - Supports BASE and SOLANA networks
  // - No API keys required
  // - Includes resource discovery for AI agents
  payai
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/api/random/:path*"],
};

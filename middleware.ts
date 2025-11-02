import { paymentMiddleware } from "x402-next";

// Configure the x402 payment middleware
// This protects your API endpoints and requires payment before access
export const middleware = paymentMiddleware(
  (process.env.X402_WALLET_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  {
    // Protect the random number API endpoint
    "/api/random": {
      price: "$0.01", // 0.01 USDC per request
      network:
        (process.env.X402_NETWORK as "base" | "base-sepolia") || "base-sepolia", // base or base-sepolia
      config: {
        description:
          "Random Number Generation Service - Returns a random number within the specified range",
        mimeType: "application/json",
        maxTimeoutSeconds: 60,
        outputSchema: {
          type: "object",
          description: "Generates a random number between min and max values",
          properties: {
            queryParameters: {
              type: "object",
              properties: {
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
            response: {
              type: "object",
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
    },
  }
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/api/random/:path*"],
};

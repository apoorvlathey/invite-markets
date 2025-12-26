import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Allow all HTTPS images (for avatars from Farcaster, ENS, etc.)
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack: (config) => {
    // Handle optional peer dependencies that cause warnings during build
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // MetaMask SDK optional dependency
      "@react-native-async-storage/async-storage": false,
      // Pino logger optional dependency
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;

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
};

export default nextConfig;

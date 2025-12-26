import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "t2.gstatic.com",
        pathname: "/faviconV2/**",
      },
    ],
  },
};

export default nextConfig;

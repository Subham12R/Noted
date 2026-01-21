import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // Disable TypeScript errors during build (run separately in CI)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

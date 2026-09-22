import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "*.local",
  ],

  experimental: {
    optimizePackageImports: ["framer-motion"],
  },

  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
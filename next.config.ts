import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "sharp", "ioredis"],
  images: {
    localPatterns: [
      { pathname: "/avatars/**" },
      { pathname: "/logo/**" },
      { pathname: "/brand/**" },
      { pathname: "/icons/**" },
      { pathname: "/api/media/**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://vercel.com https://*.vercel.com https://*.vercel.app",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      {
        source: "/app/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;

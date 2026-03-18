import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@emoji-mart/react", "@emoji-mart/data", "emoji-mart"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
    dangerouslyAllowSVG: true,
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "localhost:3001"] },
  },
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "emoji-mart": "./node_modules/emoji-mart/dist/module.js",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Enable XSS protection
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Content Security Policy - relaxed for OAuth and external APIs
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://github.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src https://accounts.google.com https://github.com; object-src 'none';",
          },
          // Referrer Policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions Policy
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          // Strict Transport Security
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

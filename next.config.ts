import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ["172.31.160.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://students-nine-tau.vercel.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;

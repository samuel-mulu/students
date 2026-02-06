import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ["172.31.160.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://192.168.1.3:4000/api/:path*",
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://school-system-oaba.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;

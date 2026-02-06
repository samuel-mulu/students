import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ["172.31.160.1"],
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://school-system-oaba.onrender.com";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

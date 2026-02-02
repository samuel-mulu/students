import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://192.168.1.3:4000/api/:path*"
            : "https://school-system-oaba.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;

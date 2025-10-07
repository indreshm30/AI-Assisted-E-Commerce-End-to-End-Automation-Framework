import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'images.unsplash.com',
      'localhost',
      '127.0.0.1',
    ],
  },
};

export default nextConfig;

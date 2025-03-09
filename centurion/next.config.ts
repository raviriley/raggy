import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["res.cloudinary.com", "raw.githubusercontent.com"],
  },
};

export default nextConfig;

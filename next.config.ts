import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: process.env.NEXT_IGNORE_TYPE_ERRORS === 'true',
  },
  env: {
    DEMO_MODE: process.env.DEMO_MODE,
  }
};

export default nextConfig;

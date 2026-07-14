import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
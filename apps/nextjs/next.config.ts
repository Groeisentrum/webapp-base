import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the runtime Docker image needs no node_modules.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the runtime Docker image needs no node_modules.
  output: "standalone",
  reactStrictMode: true,
  // Repo guidance lives in the root CLAUDE.md; generated per-app copies would compete
  // with it and drift.
  agentRules: false,
};

export default nextConfig;

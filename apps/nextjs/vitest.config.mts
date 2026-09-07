import { defineConfig } from "vitest/config";
import path from "node:path";

// Two projects, mirroring konnek360: pure modules run in node, component wiring
// tests need a DOM. Splitting them keeps the fast suite fast.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: { "@": path.resolve(__dirname, "./src") },
        },
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/.next/**"],
        },
      },
      {
        resolve: {
          alias: { "@": path.resolve(__dirname, "./src") },
        },
        test: {
          name: "wiring",
          environment: "jsdom",
          include: ["src/**/*.wiring.test.tsx"],
          exclude: ["**/node_modules/**", "**/.next/**"],
        },
      },
    ],
  },
});

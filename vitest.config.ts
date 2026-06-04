import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // `server-only` is a Next.js guard package — it has no runtime
      // behavior but Next blocks any client bundle that imports a
      // module containing it. Vitest's resolver can't find the
      // package (Next ships it internally), so we stub it to a no-op
      // so server-only modules stay testable here.
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
  },
});

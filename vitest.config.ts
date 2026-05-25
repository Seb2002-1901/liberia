import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
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
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
  },
});

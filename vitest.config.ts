import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["*.test.ts"],
    exclude: ["client/**", "node_modules/**", "e2e/**"],
  },
});

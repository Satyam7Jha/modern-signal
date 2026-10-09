import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup-env.ts"],
    projects: [
      // Pure functions: no database, no Docker (`npm run test:unit`).
      { extends: true, test: { name: "unit", include: ["tests/*.test.ts"] } },
      // Talk to the local Supabase stack over HTTP (`npm run test:db`).
      { extends: true, test: { name: "db", include: ["tests/db/**/*.test.ts"], testTimeout: 30_000 } },
    ],
  },
});

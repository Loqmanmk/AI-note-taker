import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The phone app's tests run from mobile/, which has its own dependencies.
    exclude: [...configDefaults.exclude, "mobile/**"],
  },
  resolve: {
    alias: {
      // "server-only" throws outside a Next.js server build; tests run in plain Node.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
});

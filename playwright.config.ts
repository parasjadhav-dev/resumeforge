import "dotenv/config";
import { defineConfig } from "@playwright/test";

// Its own port, so it never collides with a dev server running on 3000.
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  // One browser at a time: the screens share seeded data and one report.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    colorScheme: "light",
    reducedMotion: "reduce",
  },
  // Serves the production build (run `npm run ui:shots`, which builds first).
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { AUTH_TRUST_HOST: "true" },
  },
});

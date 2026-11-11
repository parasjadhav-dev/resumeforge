import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Neon: set DIRECT_URL (non-pooled) to use it for migrations; otherwise DATABASE_URL.
    // Empty fallback lets `prisma generate` run in CI where no database is configured.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});

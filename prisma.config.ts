import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI (migrate, db push, studio, generate) uses the direct/unpooled
// connection. Fallbacks keep `prisma generate` working in CI without a DB.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});

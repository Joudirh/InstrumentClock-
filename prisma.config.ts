import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI (migrate, db push, studio, generate) uses the direct/unpooled
// connection. Fallbacks keep `prisma generate` working in CI without a DB.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

// `prisma generate` never connects, so an empty URL is fine (postinstall, CI).
// Everything else needs a real connection — fail early with an actionable
// message instead of Prisma's generic "Connection url is empty".
const dbNotNeeded = new Set(["generate", "version", "--version", "-v", "init", "fmt"]);
if (!url && !process.argv.some((arg) => dbNotNeeded.has(arg))) {
  throw new Error(
    "DIRECT_URL/DATABASE_URL are not set. On Vercel, add them in Project Settings → " +
      "Environment Variables (Production + Preview) and make sure they are available " +
      "during builds — sensitive-only variables are not. Then redeploy."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url,
  },
});

# AGENTS.md

Static front-end (Vite, vanilla ES6 modules, plain CSS) plus a small TypeScript backend: Prisma 7 -> Neon Postgres and Neon Object Storage (S3-compatible) used by Vercel serverless functions in `api/`.

## Commands
- `npm run dev` — Vite dev server (run from repo root)
- `npm run build` — `vite build` output to `dist/` (front-end only; API is built by Vercel)
- `npm run preview` — serve the build
- `npm run db:push` / `npm run db:migrate` — sync schema to Neon (`prisma migrate dev` creates `prisma/migrations`)
- `npm run db:deploy` — apply committed migrations (used on Vercel)
- `npm run db:seed` — `tsx prisma/seed.ts`; wipes and repopulates reference data from `js/data.js`
- `npm run db:studio` — Prisma Studio (very slow to boot here; expect minutes)
- `npm run assets:upload` — upload `public/assets/*` to the S3 bucket and upsert `Asset` rows
- No tests, linter, or typecheck exist. `tsc` is present but nothing runs it; Vite/Vercel/tsx transpile without type-checking.

## Constraints / gotchas
- **Prisma 7 requires a driver adapter.** `lib/prisma.ts` uses `@prisma/adapter-neon`; `new PrismaClient()` without an adapter throws. Keep `prisma`, `@prisma/client`, `@prisma/adapter-neon` on the same version (pinned `7.10.0`).
- **Connection URLs are configured in `prisma.config.ts`, not `schema.prisma`** (the `datasource` block has no `url`). CLI commands use `DIRECT_URL` (unpooled, host without `-pooler`); the app uses the pooled `DATABASE_URL`.
- **The Prisma client is generated to `lib/generated/prisma` and is gitignored.** It must be regenerated on every fresh install/clone (`postinstall` runs `prisma generate`). Never edit generated files.
- `package.json` is `"type": "module"` because the Prisma 7 client is ESM-first. The browser files in `js/` are loaded via `<script type="module">` and are unaffected.
- `js/*.js` import Luxon from a CDN ESM URL (not an npm dep); dev/build need network access. Changing the Luxon version means editing every import.
- Flag images are referenced with absolute `/assets/<file>.png` paths (in `js/timeline.js`) and live in `public/assets/`. Serve from the repo root; opening `index.html` directly breaks modules and these paths.
- `prisma/seed.ts` imports the plain-JS `js/data.js` directly (single source of truth). Editing the data there and re-running `db:seed` is the supported way to change instruments/sessions.
- `DOCUMENTATION.md` is partly stale (says to open `index.html` directly, references `assets/*`); trust the code.

## Architecture
- Front-end: `index.html` entry; `js/main.js` wires state, events, render calls. `js/data.js` (data), `js/timezone.js` (Luxon conversions, DST via `seasons`), `js/timeline.js` (Forex timeline), `js/ui.js` (lists/filters/clocks). Theme via `data-theme` on `<html>`, persisted in `localStorage`.
- Backend: `lib/prisma.ts` (client singleton), `lib/s3-client.ts` (S3 client + `uploadFile`/`ensureBucket`/`getSignedAssetUrl`), `scripts/upload-assets.ts`, `prisma/seed.ts`, `prisma/schema.prisma`.
- API (Vercel, default export `(req, res)`): `api/instruments.ts`, `api/sessions.ts`, `api/health.ts`. The front-end loads data via `js/api.js` (`fetchAppData` → `/api/instruments` + `/api/sessions`), mapping DB rows to the front shape, and **falls back to static `js/data.js`** if the API is unreachable.
- `vite.config.js`: a dev-only middleware (`apiDevMiddleware`, `apply: 'serve'`) runs `api/*.ts` through `ssrLoadModule` during `vite dev`, so `npm run dev` reflects the Neon DB locally (Vite doesn't serve serverless functions otherwise).
- Deploy: `vercel.json` runs `prisma generate && prisma migrate deploy && vite build`. Set `DATABASE_URL`, `DIRECT_URL`, and the `AWS_*` vars in the Vercel project (they live in `.env`, which is gitignored). Bucket creation is handled by `ensureBucket` / `npm run assets:upload`.

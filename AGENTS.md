# AGENTS.md

Static front-end (Vite, vanilla ES modules, plain CSS) plus TypeScript Vercel functions in `api/`. Backend is Prisma 7 + Neon Postgres; assets live in Neon Object Storage (S3-compatible).

## Commands
- Setup: `npm install` (postinstall runs `prisma generate`), then `cp .env.example .env` and fill `DATABASE_URL` (pooled), `DIRECT_URL` (unpooled), `AWS_*`. `lib/prisma.ts` throws at import if `DATABASE_URL` is missing, so dev/migrate/seed fail without `.env`; `prisma generate` still works.
- `npm run dev` (Vite, run from repo root), `npm run build` (front-end only to `dist/`), `npm run preview`.
- DB: `npm run db:push` / `db:migrate` / `db:deploy`; `npm run db:seed` (`prisma db seed` -> `tsx prisma/seed.ts` per `prisma.config.ts`); `npm run db:studio` (very slow to boot); `npm run assets:upload`.
- `db:seed` is idempotent upserts: 14 sessions, 7 categories, instruments 72–150 + `instrument_windows`, and admin `admin@instrumentclock.com` / `admin123@` (existing password is never reset). It never wipes.
- Pages: `/admin` login, `/dashboard` ADMIN-only, `/account` USER-only. `admin.html` / `dashboard.html` / `account.html` are Vite entries; `cleanUrls` + a dev rewrite provide the clean paths. The public navbar login is USER-only; admins must use `/admin`.
- Verification: no test, linter, or typecheck script. `npx tsc --noEmit` is the only typecheck (expect/ignore errors from `lib/generated/`). `npx tsx scripts/market-hours-check.ts` exercises market-hours logic. `npx tsx scripts/verify-auth.ts` needs `npm run dev` running and creates test users/favorites in the configured DB.

## API / auth
- `api/instruments.ts`, `api/sessions.ts`, `api/health.ts` are single handlers. `api/auth.ts`, `api/me.ts`, `api/admin.ts` are routers: subpaths arrive in `req.query.__path` via `vercel.json` rewrites. `vite.config.js`'s dev middleware mirrors this with `groupMap` and shims `req.body` / `req.query` / `req.cookies` plus `res.status().json()`. Vercel Hobby caps functions at 12, so add subroutes to these routers rather than new top-level files.
- Auth: `POST /api/auth/login` (body `role` selects ADMIN or USER; a role mismatch returns the generic 401), `POST /api/auth/register` (always USER), `POST /api/auth/logout`, `GET /api/auth/session`. Cookie `ic_session` (HttpOnly, SameSite=Lax, 7 days) maps to `user_auth_tokens`; helpers are in `lib/session.ts`. The guard is `requireRole`, not `requireAuth`.
- User (`requireRole(USER)`): `/api/me/profile` GET/PUT (a password change deletes all that user's tokens), `/api/me/favorites` GET/POST/DELETE?id, `/api/me/alerts` GET/POST/PUT/DELETE?id (kind only `optimal-open` / `optimal-close`).
- Admin (`requireRole(ADMIN)`): `/api/admin/{overview,users,categories,sessions,instruments}`. Instrument create/update validates windows in `lib/admin-data.ts`, replaces `instrument_windows` transactionally, and re-derives legacy columns. Users protect the last active admin; deleting categories/sessions still referenced by instruments is refused.
- `api/sessions.ts` returns `seasons` + `forex_sessions` for the Forex timeline; it does NOT return the `sessions` table (market sessions attached to instruments). `/api/instruments` returns Prisma categories with instruments + session + windows; `js/api.js`'s `mapInstrument` / `mapSession` is the schema→front contract, so update it when renaming fields.

## Data / seed
- Source of truth is `prisma/seed-data.ts`, not `js/data.js`. Instruments are `Row`s with `t:` / `o:` spans like `"HH:MM-HH:MM"` (`+1` = next day), optional `tExtra` / `oExtra`, and descriptions in `DESCRIPTIONS` keyed by id. Timezone defaults to the session's; days default to Mon–Fri.
- Seed validation aborts before writing unless every instrument has at least one TRADING and one OPTIMAL window; `startMinute` 0–1439, `endMinute` > start and ≤ 2880, days 1–7.
- Legacy `open*/optimal*` columns remain in `schema.prisma`: the seed derives them only on create; the admin API re-derives them on create and update. The front prefers normalized `instrument_windows` and falls back to legacy columns.
- `js/data.js` is only the static fallback. `instruments.sql` is an unreferenced legacy dump; don't edit it.

## Constraints / gotchas
- Prisma 7 requires a driver adapter (`@prisma/adapter-neon`); keep `prisma`, `@prisma/client`, `@prisma/adapter-neon` on the same version (pinned `7.10.0`). URLs live in `prisma.config.ts` (CLI uses `DIRECT_URL`, app uses pooled `DATABASE_URL`); `schema.prisma` intentionally has no `url`.
- The client is generated to `lib/generated/prisma` and is tracked in git (unusual). Regenerate after schema edits; never hand-edit. Restart `npm run dev` after schema changes: `ssrLoadModule` caches `lib/prisma.ts` and the generated client, so the API can keep returning old fields.
- If the API 500s or returns stale fields, check Neon drift (`information_schema.columns`) and the generated client before blaming the front. `js/api.js` silently falls back to `js/data.js` (`source: 'static'`), so a broken API still renders, just with static data.
- Prisma blocks destructive commands from agents. `db push --force-reset` / `--accept-data-loss` require explicit user confirmation and `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` set to their verbatim consent.
- Use explicit `.js` extensions for relative runtime imports in `api/` and `lib/` (Node ESM on Vercel). `vercel.json` must include `lib/generated/prisma/**` in the function bundle because the client imports nested `.ts` runtime files. `scripts/` and `prisma/seed.ts` run under `tsx` and use extensionless imports.
- `package.json` is `"type": "module"` for the Prisma 7 client; browser files in `js/` are unaffected.
- `js/*.js` import Luxon from a CDN ESM URL (not npm), so dev/build need network access. Flag images use absolute `/assets/<file>.png` from `public/assets/`; serve from the repo root (opening `index.html` directly breaks modules and flags).
- Window times are minutes-of-day; the admin editor accepts text like `25:30` for cross-midnight ends. Do not switch it to `<input type="time">` (it cannot represent >24:00).
- Vercel needs `DATABASE_URL`, `DIRECT_URL`, and `AWS_*` available at build time (not sensitive-only); otherwise `migrate deploy` fails with "Connection url is empty" while `generate` passes.
- `DOCUMENTATION.md` and `README.md` are partly stale (README still says seed from `js/data.js`; DOCUMENTATION says open `index.html` directly). Trust the code.

## Architecture
- `index.html` -> `js/main.js` (state/events). Data via `js/api.js`; `js/timezone.js` (Luxon/DST), `js/timeline.js` (Forex timeline), `js/ui.js` (cards/filters/clocks), `js/bell.js` (open-markets bell), `js/login.js` (navbar user modal). Theme uses `localStorage` key `theme`, default dark.
- Admin UI: `js/admin/app.js` hash router + auth guard, sections under `js/admin/sections/`, window editor in `js/admin/windows.js`; user portal in `js/user/app.js`. Shared admin API helper `js/admin/common.js` redirects to `/admin` on 401.
- Server: `lib/prisma.ts` client singleton, `lib/session.ts` auth, `lib/password.ts` scrypt, `lib/rate-limit.ts` in-memory best-effort login/register limiter, `lib/admin-data.ts` slug/window validation + legacy derivation, `lib/market-hours.ts` Intl-based DST/midnight-aware checks, `lib/s3-client.ts`.
- Deploy: `vercel.json` runs `prisma generate && prisma migrate deploy && vite build`; the assets bucket is created by `ensureBucket` / `assets:upload`.

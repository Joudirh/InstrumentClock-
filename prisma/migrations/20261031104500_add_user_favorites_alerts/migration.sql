-- Migration : séparation Admin / Utilisateur + données propres à l'utilisateur.
--
-- 1. Fait basculer l'enum Role de (ADMIN, EDITOR) vers (ADMIN, USER) :
--    les EDITOR existants deviennent USER.
-- 2. La colonne users.role passe par défaut sur USER.
-- 3. Le compte admin seedé est remis en ADMIN.
-- 4. Crée les tables propres à l'utilisateur : instrument_favorites, market_alerts.
--    Les alertes n'ont pas de déclencheur automatique aujourd'hui (voir point 6).
-- Idempotente sur les créations de tables.

BEGIN;

-- 1. Transition de l'enum Role : ADMIN/EDITOR -> ADMIN/USER
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role"
  USING (CASE WHEN "role"::text = 'EDITOR' THEN 'USER' ELSE "role"::text END)::"Role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';
DROP TYPE "Role_old";

-- 3. S'assurer que le compte administrateur seedé est bien ADMIN.
UPDATE "users" SET "role" = 'ADMIN' WHERE "email" = 'admin@instrumentclock.com';

-- 4. Tables propres à l'utilisateur (favoris et alertes).
CREATE TABLE IF NOT EXISTS "instrument_favorites" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  instrument_id INTEGER NOT NULL REFERENCES "instruments"(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, instrument_id)
);

CREATE TABLE IF NOT EXISTS "market_alerts" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  instrument_id INTEGER NOT NULL REFERENCES "instruments"(id) ON DELETE CASCADE,
  kind VARCHAR NOT NULL DEFAULT 'optimal-open',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

COMMIT;

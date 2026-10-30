-- Migration B : seed des sessions, backfill session_id et instrument_windows depuis
-- les colonnes legacy, vérification bloquante, puis verrouillage (NOT NULL + CHECK).
-- Idempotente : chaque étape ne touche que les lignes non déjà traitées.

-- 1. Seed des sessions (rejetable sans doublon)
INSERT INTO "sessions" ("slug", "name", "region", "timezone", "is_24_7", "position") VALUES
  ('sydney',      'Sydney',      'OCEANIA', 'Australia/Sydney', false, 1),
  ('tokyo',       'Tokyo',       'ASIA',    'Asia/Tokyo',       false, 2),
  ('shanghai',    'Shanghai',    'ASIA',    'Asia/Shanghai',    false, 3),
  ('hong-kong',   'Hong Kong',   'ASIA',    'Asia/Hong_Kong',   false, 4),
  ('singapore',   'Singapour',   'ASIA',    'Asia/Singapore',   false, 5),
  ('tunis',       'Tunis',       'AFRICA',  'Africa/Tunis',     false, 6),
  ('london',      'Londres',     'EUROPE',  'Europe/London',    false, 7),
  ('paris',       'Paris',       'EUROPE',  'Europe/Paris',     false, 8),
  ('berlin',      'Francfort',   'EUROPE',  'Europe/Berlin',    false, 9),
  ('zurich',      'Zurich',      'EUROPE',  'Europe/Zurich',    false, 10),
  ('madrid',      'Madrid',      'EUROPE',  'Europe/Madrid',    false, 11),
  ('new-york',    'New York',    'AMERICA', 'America/New_York', false, 12),
  ('chicago',     'Chicago',     'AMERICA', 'America/Chicago',  false, 13),
  ('global-24-7', 'Global 24/7', 'GLOBAL',  'UTC',              true,  14)
ON CONFLICT ("slug") DO NOTHING;

-- 2. Backfill session_id : is_24_7 -> global-24-7, sinon open_tz -> timezone de la session
UPDATE "instruments" AS i
SET "session_id" = s."id"
FROM "sessions" AS s
WHERE i."session_id" IS NULL
  AND (
    (i."is_24_7" AND s."slug" = 'global-24-7')
    OR (NOT i."is_24_7" AND i."open_tz" = s."timezone")
  );

-- 3. Copie legacy -> instrument_windows (TRADING puis OPTIMAL), uniquement si l'instrument
--    n'a pas encore de plage de ce kind (idempotent). end_minute ajoute 1440 (799.8 -> 800 (13:20) dans legacy).
INSERT INTO "instrument_windows" ("instrument_id", "kind", "days", "start_minute", "end_minute", "timezone", "position")
SELECT i."id", 'TRADING'::"WindowKind",
       ARRAY(SELECT generate_series(i."open_day", i."close_day")),
       ROUND(i."open_hour" * 60)::int,
       ROUND(i."close_hour" * 60)::int + CASE WHEN i."close_hour" <= i."open_hour" THEN 1440 ELSE 0 END,
       i."open_tz",
       0
FROM "instruments" AS i
WHERE NOT EXISTS (
  SELECT 1 FROM "instrument_windows" w WHERE w."instrument_id" = i."id" AND w."kind" = 'TRADING'
);

INSERT INTO "instrument_windows" ("instrument_id", "kind", "days", "start_minute", "end_minute", "timezone", "position")
SELECT i."id", 'OPTIMAL'::"WindowKind",
       ARRAY(SELECT generate_series(i."open_day", i."close_day")),
       ROUND(i."optimal_start_hour" * 60)::int,
       ROUND(i."optimal_end_hour" * 60)::int + CASE WHEN i."optimal_end_hour" <= i."optimal_start_hour" THEN 1440 ELSE 0 END,
       i."optimal_tz",
       0
FROM "instruments" AS i
WHERE NOT EXISTS (
  SELECT 1 FROM "instrument_windows" w WHERE w."instrument_id" = i."id" AND w."kind" = 'OPTIMAL'
);

-- 4. Vérification bloquante : plus aucun instrument sans session
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "instruments" WHERE "session_id" IS NULL) THEN
    RAISE EXCEPTION 'Instruments sans session';
  END IF;
END $$;

-- 5a. session_id NOT NULL
ALTER TABLE "instruments" ALTER COLUMN "session_id" SET NOT NULL;

-- 5b. CHECK sur instrument_windows (guarde idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instrument_windows_minutes_check'
  ) THEN
    ALTER TABLE "instrument_windows" ADD CONSTRAINT "instrument_windows_minutes_check"
      CHECK ("start_minute" >= 0 AND "start_minute" < 1440 AND "end_minute" > "start_minute" AND "end_minute" <= 2880);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instrument_windows_days_check'
  ) THEN
    ALTER TABLE "instrument_windows" ADD CONSTRAINT "instrument_windows_days_check"
      CHECK (cardinality("days") > 0 AND "days" <@ ARRAY[1, 2, 3, 4, 5, 6, 7]);
  END IF;
END $$;

-- 5c. CHECK sur instruments.days legacy (guarde idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instruments_open_day_check'
  ) THEN
    ALTER TABLE "instruments" ADD CONSTRAINT "instruments_open_day_check"
      CHECK ("open_day" >= 1 AND "open_day" <= 7);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instruments_close_day_check'
  ) THEN
    ALTER TABLE "instruments" ADD CONSTRAINT "instruments_close_day_check"
      CHECK ("close_day" >= 1 AND "close_day" <= 7);
  END IF;
END $$;

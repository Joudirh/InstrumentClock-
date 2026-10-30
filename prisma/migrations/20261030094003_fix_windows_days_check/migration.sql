-- Rectification §2.1 : le CHECK historique acceptait days = NULL
-- (cardinality(NULL) = NULL → CHECK non évalué → ligne acceptée).
-- On garde la colonne nullable (pas de SET NOT NULL, pour éviter la dérive avec schema.prisma).
ALTER TABLE "instrument_windows" DROP CONSTRAINT IF EXISTS "instrument_windows_days_check";

ALTER TABLE "instrument_windows" ADD CONSTRAINT "instrument_windows_days_check"
  CHECK (COALESCE(cardinality(days), 0) > 0 AND days <@ ARRAY[1,2,3,4,5,6,7]);

-- Rectification §2.2 : unicité (instrument, kind, position).
-- Contrôle préalable exécuté : 0 doublon existant (résultat conservé dans le rapport).
-- Guarde idempotente : ne crée l'index que s'il n'existe pas déjà.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'instrument_windows_instrument_id_kind_position_key'
  ) THEN
    CREATE UNIQUE INDEX "instrument_windows_instrument_id_kind_position_key"
      ON "instrument_windows" ("instrument_id", "kind", "position");
  END IF;
END $$;

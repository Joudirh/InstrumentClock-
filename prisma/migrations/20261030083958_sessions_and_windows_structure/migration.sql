-- CreateEnum
CREATE TYPE "Region" AS ENUM ('ASIA', 'EUROPE', 'AMERICA', 'OCEANIA', 'AFRICA', 'GLOBAL');

-- CreateEnum
CREATE TYPE "WindowKind" AS ENUM ('TRADING', 'OPTIMAL');

-- AlterTable
ALTER TABLE "instruments" ADD COLUMN     "session_id" INTEGER;

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "timezone" TEXT NOT NULL,
    "is_24_7" BOOLEAN NOT NULL DEFAULT false,
    "flag" TEXT,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_windows" (
    "id" SERIAL NOT NULL,
    "instrument_id" INTEGER NOT NULL,
    "kind" "WindowKind" NOT NULL,
    "days" INTEGER[],
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "instrument_windows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_slug_key" ON "sessions"("slug");

-- CreateIndex
CREATE INDEX "instrument_windows_instrument_id_kind_idx" ON "instrument_windows"("instrument_id", "kind");

-- CreateIndex
CREATE INDEX "instruments_category_id_idx" ON "instruments"("category_id");

-- CreateIndex
CREATE INDEX "instruments_session_id_idx" ON "instruments"("session_id");

-- AddForeignKey
ALTER TABLE "instrument_windows" ADD CONSTRAINT "instrument_windows_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

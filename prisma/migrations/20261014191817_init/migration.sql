-- CreateTable
CREATE TABLE "seasons" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reference" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instruments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "open_day" INTEGER NOT NULL DEFAULT 1,
    "close_day" INTEGER NOT NULL DEFAULT 5,
    "open_hour" DOUBLE PRECISION NOT NULL,
    "close_hour" DOUBLE PRECISION NOT NULL,
    "open_tz" TEXT NOT NULL,
    "optimal_start_hour" DOUBLE PRECISION NOT NULL,
    "optimal_end_hour" DOUBLE PRECISION NOT NULL,
    "optimal_tz" TEXT NOT NULL,
    "is_24_7" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forex_sessions" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "start_hour" INTEGER NOT NULL,
    "end_hour" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "y_offset" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "forex_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "instruments" ADD COLUMN     "optimal_segments" JSONB,
ADD COLUMN     "schedule_segments" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "seasons_key_key" ON "seasons"("key");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "instruments_slug_key" ON "instruments"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "forex_sessions_slug_key" ON "forex_sessions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "assets_key_key" ON "assets"("key");

-- AddForeignKey
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

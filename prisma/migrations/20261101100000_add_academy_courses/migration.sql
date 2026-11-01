BEGIN;

CREATE TYPE "AcademyCourseStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "academy_courses" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "objectives" JSONB NOT NULL,
  "content" JSONB NOT NULL,
  "source_markdown" TEXT NOT NULL,
  "status" "AcademyCourseStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "verified_by_id" INTEGER,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_courses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academy_courses_verified_by_id_fkey"
    FOREIGN KEY ("verified_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "academy_courses_code_key" ON "academy_courses"("code");
CREATE UNIQUE INDEX "academy_courses_slug_key" ON "academy_courses"("slug");
CREATE INDEX "academy_courses_status_domain_path_idx"
  ON "academy_courses"("status", "domain", "path");

COMMIT;

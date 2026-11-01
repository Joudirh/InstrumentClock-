CREATE SCHEMA "public";
CREATE TYPE "Region" AS ENUM('ASIA', 'EUROPE', 'AMERICA', 'OCEANIA', 'AFRICA', 'GLOBAL');
CREATE TYPE "WindowKind" AS ENUM('TRADING', 'OPTIMAL');
CREATE TYPE "Role" AS ENUM('ADMIN', 'USER');
CREATE TYPE "AcademyCourseStatus" AS ENUM('DRAFT', 'PUBLISHED');
CREATE ROLE "cloud_admin" WITH SUPERUSER CREATEDB CREATEROLE LOGIN REPLICATION BYPASSRLS;
CREATE ROLE "neon_service" WITH CREATEDB CREATEROLE LOGIN REPLICATION BYPASSRLS;
CREATE ROLE "neon_superuser" WITH CREATEDB CREATEROLE REPLICATION BYPASSRLS;
CREATE ROLE "neondb_owner" WITH CREATEDB CREATEROLE LOGIN REPLICATION BYPASSRLS;
CREATE ROLE "pg_checkpoint";
CREATE ROLE "pg_create_subscription";
CREATE ROLE "pg_database_owner";
CREATE ROLE "pg_execute_server_program";
CREATE ROLE "pg_maintain";
CREATE ROLE "pg_monitor";
CREATE ROLE "pg_read_all_data";
CREATE ROLE "pg_read_all_settings";
CREATE ROLE "pg_read_all_stats";
CREATE ROLE "pg_read_server_files";
CREATE ROLE "pg_signal_autovacuum_worker";
CREATE ROLE "pg_signal_backend";
CREATE ROLE "pg_stat_scan_tables";
CREATE ROLE "pg_use_reserved_connections";
CREATE ROLE "pg_write_all_data";
CREATE ROLE "pg_write_server_files";
GRANT TRIGGER ON "_prisma_migrations" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "_prisma_migrations" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "_prisma_migrations" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "_prisma_migrations" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "_prisma_migrations" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "_prisma_migrations" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "_prisma_migrations" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "academy_courses" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "academy_courses" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "academy_courses" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "academy_courses" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "academy_courses" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "academy_courses" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "academy_courses" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "assets" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "assets" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "assets" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "assets" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "assets" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "assets" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "assets" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "categories" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "categories" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "categories" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "categories" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "categories" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "categories" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "categories" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "forex_sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "forex_sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "forex_sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "forex_sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "forex_sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "forex_sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "forex_sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "instrument_favorites" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "instrument_favorites" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "instrument_favorites" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "instrument_favorites" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "instrument_favorites" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "instrument_favorites" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "instrument_favorites" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "instrument_windows" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "instrument_windows" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "instrument_windows" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "instrument_windows" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "instrument_windows" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "instrument_windows" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "instrument_windows" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "instruments" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "instruments" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "instruments" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "instruments" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "instruments" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "instruments" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "instruments" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "market_alerts" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "market_alerts" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "market_alerts" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "market_alerts" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "market_alerts" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "market_alerts" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "market_alerts" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "seasons" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "seasons" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "seasons" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "seasons" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "seasons" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "seasons" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "seasons" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "sessions" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "user_auth_tokens" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "user_auth_tokens" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "user_auth_tokens" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "user_auth_tokens" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "user_auth_tokens" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "user_auth_tokens" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "user_auth_tokens" TO "neondb_owner" WITH GRANT OPTION;
GRANT INSERT ON "users" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRIGGER ON "users" TO "neondb_owner" WITH GRANT OPTION;
GRANT REFERENCES ON "users" TO "neondb_owner" WITH GRANT OPTION;
GRANT TRUNCATE ON "users" TO "neondb_owner" WITH GRANT OPTION;
GRANT DELETE ON "users" TO "neondb_owner" WITH GRANT OPTION;
GRANT UPDATE ON "users" TO "neondb_owner" WITH GRANT OPTION;
GRANT SELECT ON "users" TO "neondb_owner" WITH GRANT OPTION;
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
CREATE TABLE "academy_courses" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"domain" text NOT NULL,
	"path" text NOT NULL,
	"level" text NOT NULL,
	"summary" text NOT NULL,
	"objectives" jsonb NOT NULL,
	"content" jsonb NOT NULL,
	"source_markdown" text NOT NULL,
	"status" AcademyCourseStatus DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"verified_by_id" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp NOT NULL
);
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY,
	"key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text,
	"size" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
CREATE TABLE "forex_sessions" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"flag" text NOT NULL,
	"start_hour" integer NOT NULL,
	"end_hour" integer NOT NULL,
	"timezone" text NOT NULL,
	"color" text NOT NULL,
	"y_offset" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
CREATE TABLE "instrument_favorites" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instrument_favorites_user_id_instrument_id_key" UNIQUE("user_id","instrument_id")
);
CREATE TABLE "instrument_windows" (
	"id" serial PRIMARY KEY,
	"instrument_id" integer NOT NULL,
	"kind" WindowKind NOT NULL,
	"days" integer[],
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"timezone" text NOT NULL,
	"label" text,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "instrument_windows_days_check" CHECK (((COALESCE(cardinality(days), 0) > 0) AND (days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]))),
	CONSTRAINT "instrument_windows_minutes_check" CHECK (((start_minute >= 0) AND (start_minute < 1440) AND (end_minute > start_minute) AND (end_minute <= 2880)))
);
CREATE TABLE "instruments" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" integer NOT NULL,
	"open_day" integer DEFAULT 1 NOT NULL,
	"close_day" integer DEFAULT 5 NOT NULL,
	"open_hour" double precision NOT NULL,
	"close_hour" double precision NOT NULL,
	"open_tz" text NOT NULL,
	"optimal_start_hour" double precision NOT NULL,
	"optimal_end_hour" double precision NOT NULL,
	"optimal_tz" text NOT NULL,
	"is_24_7" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp NOT NULL,
	"optimal_segments" jsonb,
	"schedule_segments" jsonb,
	"session_id" integer NOT NULL,
	"description" text,
	CONSTRAINT "instruments_close_day_check" CHECK (((close_day >= 1) AND (close_day <= 7))),
	CONSTRAINT "instruments_open_day_check" CHECK (((open_day >= 1) AND (open_day <= 7)))
);
CREATE TABLE "market_alerts" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"kind" varchar DEFAULT 'optimal-open' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"reference" timestamp NOT NULL
);
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"region" Region NOT NULL,
	"timezone" text NOT NULL,
	"is_24_7" boolean DEFAULT false NOT NULL,
	"flag" text,
	"color" text,
	"position" integer DEFAULT 0 NOT NULL
);
CREATE TABLE "user_auth_tokens" (
	"id" serial PRIMARY KEY,
	"token" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" Role DEFAULT 'USER' NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp NOT NULL
);
CREATE UNIQUE INDEX "_prisma_migrations_pkey" ON "_prisma_migrations" ("id");
CREATE UNIQUE INDEX "academy_courses_code_key" ON "academy_courses" ("code");
CREATE UNIQUE INDEX "academy_courses_pkey" ON "academy_courses" ("id");
CREATE UNIQUE INDEX "academy_courses_slug_key" ON "academy_courses" ("slug");
CREATE INDEX "academy_courses_status_domain_path_idx" ON "academy_courses" ("status","domain","path");
CREATE UNIQUE INDEX "assets_key_key" ON "assets" ("key");
CREATE UNIQUE INDEX "assets_pkey" ON "assets" ("id");
CREATE UNIQUE INDEX "categories_pkey" ON "categories" ("id");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" ("slug");
CREATE UNIQUE INDEX "forex_sessions_pkey" ON "forex_sessions" ("id");
CREATE UNIQUE INDEX "forex_sessions_slug_key" ON "forex_sessions" ("slug");
CREATE UNIQUE INDEX "instrument_favorites_pkey" ON "instrument_favorites" ("id");
CREATE UNIQUE INDEX "instrument_favorites_user_id_instrument_id_key" ON "instrument_favorites" ("user_id","instrument_id");
CREATE INDEX "instrument_windows_instrument_id_kind_idx" ON "instrument_windows" ("instrument_id","kind");
CREATE UNIQUE INDEX "instrument_windows_instrument_id_kind_position_key" ON "instrument_windows" ("instrument_id","kind","position");
CREATE UNIQUE INDEX "instrument_windows_pkey" ON "instrument_windows" ("id");
CREATE INDEX "instruments_category_id_idx" ON "instruments" ("category_id");
CREATE UNIQUE INDEX "instruments_pkey" ON "instruments" ("id");
CREATE INDEX "instruments_session_id_idx" ON "instruments" ("session_id");
CREATE UNIQUE INDEX "instruments_slug_key" ON "instruments" ("slug");
CREATE UNIQUE INDEX "market_alerts_pkey" ON "market_alerts" ("id");
CREATE UNIQUE INDEX "seasons_key_key" ON "seasons" ("key");
CREATE UNIQUE INDEX "seasons_pkey" ON "seasons" ("id");
CREATE UNIQUE INDEX "sessions_pkey" ON "sessions" ("id");
CREATE UNIQUE INDEX "sessions_slug_key" ON "sessions" ("slug");
CREATE UNIQUE INDEX "user_auth_tokens_pkey" ON "user_auth_tokens" ("id");
CREATE UNIQUE INDEX "user_auth_tokens_token_key" ON "user_auth_tokens" ("token");
CREATE INDEX "user_auth_tokens_user_id_idx" ON "user_auth_tokens" ("user_id");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");
ALTER TABLE "academy_courses" ADD CONSTRAINT "academy_courses_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_favorites" ADD CONSTRAINT "instrument_favorites_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE;
ALTER TABLE "instrument_favorites" ADD CONSTRAINT "instrument_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "instrument_windows" ADD CONSTRAINT "instrument_windows_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_alerts" ADD CONSTRAINT "market_alerts_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE;
ALTER TABLE "market_alerts" ADD CONSTRAINT "market_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_auth_tokens" ADD CONSTRAINT "user_auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
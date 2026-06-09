DO $$
BEGIN
  IF to_regtype('"ReportTargetType"') IS NULL THEN
    CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT', 'CONSENSUS', 'DEBATE');
  END IF;

  IF to_regtype('"ReportStatus"') IS NULL THEN
    CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED');
  END IF;
END $$;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_CONSENSUS_IN_DEBATE';

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reports" (
  "id" TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "debate_bookmarks" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "debate_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "debate_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "debate_subscriptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "debate_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "debate_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

CREATE INDEX IF NOT EXISTS "reports_reporter_id_idx" ON "reports"("reporter_id");
CREATE INDEX IF NOT EXISTS "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "debate_bookmarks_user_id_debate_id_key" ON "debate_bookmarks"("user_id", "debate_id");
CREATE INDEX IF NOT EXISTS "debate_bookmarks_debate_id_idx" ON "debate_bookmarks"("debate_id");

CREATE UNIQUE INDEX IF NOT EXISTS "debate_subscriptions_user_id_debate_id_key" ON "debate_subscriptions"("user_id", "debate_id");
CREATE INDEX IF NOT EXISTS "debate_subscriptions_debate_id_idx" ON "debate_subscriptions"("debate_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_user_id_fkey') THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_reporter_id_fkey') THEN
    ALTER TABLE "reports"
      ADD CONSTRAINT "reports_reporter_id_fkey"
      FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debate_bookmarks_user_id_fkey') THEN
    ALTER TABLE "debate_bookmarks"
      ADD CONSTRAINT "debate_bookmarks_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debate_bookmarks_debate_id_fkey') THEN
    ALTER TABLE "debate_bookmarks"
      ADD CONSTRAINT "debate_bookmarks_debate_id_fkey"
      FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debate_subscriptions_user_id_fkey') THEN
    ALTER TABLE "debate_subscriptions"
      ADD CONSTRAINT "debate_subscriptions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debate_subscriptions_debate_id_fkey') THEN
    ALTER TABLE "debate_subscriptions"
      ADD CONSTRAINT "debate_subscriptions_debate_id_fkey"
      FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

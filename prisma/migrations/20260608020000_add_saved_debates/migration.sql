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

CREATE UNIQUE INDEX IF NOT EXISTS "debate_bookmarks_user_id_debate_id_key" ON "debate_bookmarks"("user_id", "debate_id");
CREATE INDEX IF NOT EXISTS "debate_bookmarks_debate_id_idx" ON "debate_bookmarks"("debate_id");

CREATE UNIQUE INDEX IF NOT EXISTS "debate_subscriptions_user_id_debate_id_key" ON "debate_subscriptions"("user_id", "debate_id");
CREATE INDEX IF NOT EXISTS "debate_subscriptions_debate_id_idx" ON "debate_subscriptions"("debate_id");

DO $$
BEGIN
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

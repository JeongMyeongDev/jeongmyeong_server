ALTER TABLE "debates" DROP CONSTRAINT IF EXISTS "debates_creator_id_fkey";

ALTER TABLE "debates" ALTER COLUMN "creator_id" DROP NOT NULL;

ALTER TABLE "debates"
  ADD CONSTRAINT "debates_creator_id_fkey"
  FOREIGN KEY ("creator_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

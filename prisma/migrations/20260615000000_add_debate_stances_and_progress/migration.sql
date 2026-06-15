-- CreateEnum
CREATE TYPE "DebateStance" AS ENUM ('PRO', 'CON', 'NEUTRAL');

-- AlterTable
ALTER TABLE "debates"
ADD COLUMN "result_summary" TEXT,
ADD COLUMN "stance_distribution" JSONB;

-- AlterTable
ALTER TABLE "posts"
ADD COLUMN "stance" "DebateStance";

-- CreateTable
CREATE TABLE "debate_user_stances" (
    "id" TEXT NOT NULL,
    "debate_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stance" "DebateStance" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debate_user_stances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "debate_user_stances_debate_id_user_id_key" ON "debate_user_stances"("debate_id", "user_id");

-- CreateIndex
CREATE INDEX "debate_user_stances_user_id_idx" ON "debate_user_stances"("user_id");

-- AddForeignKey
ALTER TABLE "debate_user_stances" ADD CONSTRAINT "debate_user_stances_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debate_user_stances" ADD CONSTRAINT "debate_user_stances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "DefinitionReferenceType" AS ENUM ('DEBATE_STANDARD', 'GLOBAL_REFERENCE');

CREATE TABLE "definition_references" (
    "id" TEXT NOT NULL,
    "debate_id" TEXT NOT NULL,
    "post_id" TEXT,
    "comment_id" TEXT,
    "definition_id" TEXT NOT NULL,
    "selected_text" TEXT NOT NULL,
    "start_offset" INTEGER NOT NULL,
    "end_offset" INTEGER NOT NULL,
    "reference_type" "DefinitionReferenceType" NOT NULL,
    "creator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "definition_references_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "definition_references_one_target_check" CHECK (
        ("post_id" IS NOT NULL AND "comment_id" IS NULL)
        OR ("post_id" IS NULL AND "comment_id" IS NOT NULL)
    ),
    CONSTRAINT "definition_references_offset_check" CHECK ("start_offset" >= 0 AND "end_offset" > "start_offset")
);

CREATE INDEX "definition_references_debate_id_idx" ON "definition_references"("debate_id");
CREATE INDEX "definition_references_post_id_idx" ON "definition_references"("post_id");
CREATE INDEX "definition_references_comment_id_idx" ON "definition_references"("comment_id");
CREATE INDEX "definition_references_definition_id_idx" ON "definition_references"("definition_id");
CREATE INDEX "definition_references_creator_id_idx" ON "definition_references"("creator_id");

ALTER TABLE "definition_references" ADD CONSTRAINT "definition_references_debate_id_fkey"
    FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "definition_references" ADD CONSTRAINT "definition_references_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "definition_references" ADD CONSTRAINT "definition_references_comment_id_fkey"
    FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "definition_references" ADD CONSTRAINT "definition_references_definition_id_fkey"
    FOREIGN KEY ("definition_id") REFERENCES "definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "definition_references" ADD CONSTRAINT "definition_references_creator_id_fkey"
    FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

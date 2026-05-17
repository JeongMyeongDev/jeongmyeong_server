-- Align the existing camelCase MVP schema with the snake_case core schema.
-- This migration preserves existing rows by renaming columns instead of dropping them.

ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;
UPDATE "users" SET "status" = 'SUSPENDED' WHERE "status" = 'INACTIVE';
ALTER TABLE "users" ALTER COLUMN "status" TYPE "UserStatus" USING ("status"::text::"UserStatus");
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "UserStatus_old";

ALTER TYPE "CloseConditionType" ADD VALUE IF NOT EXISTS 'TARGET_REACHED';
ALTER TYPE "PostStatus" ADD VALUE IF NOT EXISTS 'HIDDEN';
ALTER TYPE "CommentStatus" ADD VALUE IF NOT EXISTS 'HIDDEN';
ALTER TYPE "ConsensusStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ConsensusStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

CREATE TYPE "DebateMemberRole" AS ENUM ('CREATOR', 'PARTICIPANT', 'MODERATOR');
CREATE TYPE "DefinitionScope" AS ENUM ('IN_DEBATE', 'GLOBAL_REFERENCE');
CREATE TYPE "DefinitionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ModerationTargetType" AS ENUM ('POST', 'COMMENT', 'CONSENSUS', 'DEBATE');
CREATE TYPE "ModerationActionType" AS ENUM ('HIDE', 'DELETE', 'CLOSE', 'RESTORE');

ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash";
ALTER TABLE "users" RENAME COLUMN "profileImage" TO "profile_image";
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "debates" DROP CONSTRAINT IF EXISTS "debates_creatorId_fkey";
DROP INDEX IF EXISTS "debates_creatorId_idx";
ALTER TABLE "debates" RENAME COLUMN "creatorId" TO "creator_id";
ALTER TABLE "debates" RENAME COLUMN "debateType" TO "debate_type";
ALTER TABLE "debates" RENAME COLUMN "closeConditionType" TO "close_condition_type";
ALTER TABLE "debates" RENAME COLUMN "closeAt" TO "close_at";
ALTER TABLE "debates" RENAME COLUMN "archivedAt" TO "archived_at";
ALTER TABLE "debates" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "debates" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "debates" ADD COLUMN "parent_debate_id" TEXT;
ALTER TABLE "debates" ADD COLUMN "source_selection_target_id" TEXT;
ALTER TABLE "debates" ADD COLUMN "closed_at" TIMESTAMP(3);

ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_debateId_fkey";
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_authorId_fkey";
DROP INDEX IF EXISTS "posts_debateId_idx";
DROP INDEX IF EXISTS "posts_authorId_idx";
ALTER TABLE "posts" RENAME COLUMN "debateId" TO "debate_id";
ALTER TABLE "posts" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "posts" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "posts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "posts" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_debateId_fkey";
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_postId_fkey";
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_parentCommentId_fkey";
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_authorId_fkey";
DROP INDEX IF EXISTS "comments_postId_idx";
DROP INDEX IF EXISTS "comments_parentCommentId_idx";
DROP INDEX IF EXISTS "comments_authorId_idx";
ALTER TABLE "comments" RENAME COLUMN "debateId" TO "debate_id";
ALTER TABLE "comments" RENAME COLUMN "postId" TO "post_id";
ALTER TABLE "comments" RENAME COLUMN "parentCommentId" TO "parent_comment_id";
ALTER TABLE "comments" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "comments" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "comments" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "comments" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "comments" ALTER COLUMN "post_id" DROP NOT NULL;

ALTER TABLE "selection_targets" DROP CONSTRAINT IF EXISTS "selection_targets_debateId_fkey";
ALTER TABLE "selection_targets" DROP CONSTRAINT IF EXISTS "selection_targets_creatorId_fkey";
ALTER TABLE "selection_targets" DROP CONSTRAINT IF EXISTS "selection_targets_commentId_fkey";
DROP INDEX IF EXISTS "selection_targets_commentId_key";
DROP INDEX IF EXISTS "selection_targets_debateId_idx";
DROP INDEX IF EXISTS "selection_targets_sourceType_sourceId_idx";
ALTER TABLE "selection_targets" RENAME COLUMN "debateId" TO "debate_id";
ALTER TABLE "selection_targets" RENAME COLUMN "creatorId" TO "creator_id";
ALTER TABLE "selection_targets" RENAME COLUMN "sourceType" TO "source_type";
ALTER TABLE "selection_targets" RENAME COLUMN "sourceId" TO "source_id";
ALTER TABLE "selection_targets" RENAME COLUMN "selectedText" TO "selected_text";
ALTER TABLE "selection_targets" RENAME COLUMN "startOffset" TO "start_offset";
ALTER TABLE "selection_targets" RENAME COLUMN "endOffset" TO "end_offset";
ALTER TABLE "selection_targets" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "selection_targets" DROP COLUMN IF EXISTS "commentId";

ALTER TABLE "consensuses" DROP CONSTRAINT IF EXISTS "consensuses_debateId_fkey";
ALTER TABLE "consensuses" DROP CONSTRAINT IF EXISTS "consensuses_selectionTargetId_fkey";
ALTER TABLE "consensuses" DROP CONSTRAINT IF EXISTS "consensuses_creatorId_fkey";
DROP INDEX IF EXISTS "consensuses_debateId_idx";
DROP INDEX IF EXISTS "consensuses_selectionTargetId_idx";
ALTER TABLE "consensuses" RENAME COLUMN "debateId" TO "debate_id";
ALTER TABLE "consensuses" RENAME COLUMN "selectionTargetId" TO "selection_target_id";
ALTER TABLE "consensuses" RENAME COLUMN "creatorId" TO "creator_id";
ALTER TABLE "consensuses" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "consensuses" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "consensuses" ADD COLUMN "result_summary" TEXT;
ALTER TABLE "consensuses" ADD COLUMN "approved_at" TIMESTAMP(3);
ALTER TABLE "consensuses" ADD COLUMN "closed_at" TIMESTAMP(3);
ALTER TABLE "consensuses" ALTER COLUMN "selection_target_id" SET NOT NULL;

ALTER TABLE "consensus_votes" DROP CONSTRAINT IF EXISTS "consensus_votes_consensusId_fkey";
ALTER TABLE "consensus_votes" DROP CONSTRAINT IF EXISTS "consensus_votes_userId_fkey";
DROP INDEX IF EXISTS "consensus_votes_consensusId_userId_key";
DROP INDEX IF EXISTS "consensus_votes_userId_idx";
ALTER TABLE "consensus_votes" RENAME COLUMN "consensusId" TO "consensus_id";
ALTER TABLE "consensus_votes" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "consensus_votes" RENAME COLUMN "voteType" TO "vote_type";
ALTER TABLE "consensus_votes" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "consensus_votes" RENAME COLUMN "updatedAt" TO "updated_at";

CREATE TABLE "debate_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "debate_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "debate_tag_maps" (
    "id" TEXT NOT NULL,
    "debate_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "debate_tag_maps_pkey" PRIMARY KEY ("id")
);

INSERT INTO "debate_tags" ("id", "name")
SELECT gen_random_uuid()::text, tag_name
FROM (
  SELECT DISTINCT unnest("tags") AS tag_name
  FROM "debates"
  WHERE "tags" IS NOT NULL
) AS source_tags
WHERE tag_name IS NOT NULL AND tag_name <> '';

INSERT INTO "debate_tag_maps" ("id", "debate_id", "tag_id")
SELECT gen_random_uuid()::text, d."id", t."id"
FROM "debates" d
CROSS JOIN LATERAL unnest(d."tags") AS tag_name
JOIN "debate_tags" t ON t."name" = tag_name;

ALTER TABLE "debates" DROP COLUMN IF EXISTS "tags";

CREATE TABLE "debate_participants" (
    "id" TEXT NOT NULL,
    "debate_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMP(3),
    "role_in_debate" "DebateMemberRole" NOT NULL DEFAULT 'PARTICIPANT',
    CONSTRAINT "debate_participants_pkey" PRIMARY KEY ("id")
);

INSERT INTO "debate_participants" ("id", "debate_id", "user_id", "joined_at", "role_in_debate")
SELECT gen_random_uuid()::text, "id", "creator_id", COALESCE("created_at", CURRENT_TIMESTAMP), 'CREATOR'
FROM "debates"
ON CONFLICT DO NOTHING;

CREATE TABLE "definitions" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_debate_id" TEXT NOT NULL,
    "source_consensus_id" TEXT,
    "selection_target_id" TEXT,
    "scope" "DefinitionScope" NOT NULL,
    "status" "DefinitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "creator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "definition_terms" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "normalized_term" TEXT NOT NULL,
    "original_term" TEXT NOT NULL,
    CONSTRAINT "definition_terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "moderation_logs" (
    "id" TEXT NOT NULL,
    "debate_id" TEXT NOT NULL,
    "target_type" "ModerationTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "action_type" "ModerationActionType" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "debate_tags_name_key" ON "debate_tags"("name");
CREATE UNIQUE INDEX "debate_tag_maps_debate_id_tag_id_key" ON "debate_tag_maps"("debate_id", "tag_id");
CREATE INDEX "debate_tag_maps_tag_id_idx" ON "debate_tag_maps"("tag_id");
CREATE UNIQUE INDEX "debate_participants_debate_id_user_id_key" ON "debate_participants"("debate_id", "user_id");
CREATE INDEX "debate_participants_user_id_idx" ON "debate_participants"("user_id");
CREATE INDEX "definitions_term_idx" ON "definitions"("term");
CREATE INDEX "definitions_source_debate_id_idx" ON "definitions"("source_debate_id");
CREATE INDEX "definitions_source_consensus_id_idx" ON "definitions"("source_consensus_id");
CREATE INDEX "definitions_selection_target_id_idx" ON "definitions"("selection_target_id");
CREATE INDEX "definitions_scope_idx" ON "definitions"("scope");
CREATE INDEX "definitions_status_idx" ON "definitions"("status");
CREATE INDEX "definition_terms_normalized_term_idx" ON "definition_terms"("normalized_term");
CREATE INDEX "moderation_logs_debate_id_idx" ON "moderation_logs"("debate_id");
CREATE INDEX "moderation_logs_actor_id_idx" ON "moderation_logs"("actor_id");
CREATE INDEX "moderation_logs_target_type_target_id_idx" ON "moderation_logs"("target_type", "target_id");

CREATE INDEX "debates_creator_id_idx" ON "debates"("creator_id");
CREATE INDEX "debates_parent_debate_id_idx" ON "debates"("parent_debate_id");
CREATE INDEX "debates_source_selection_target_id_idx" ON "debates"("source_selection_target_id");
CREATE INDEX "posts_debate_id_idx" ON "posts"("debate_id");
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");
CREATE INDEX "comments_debate_id_idx" ON "comments"("debate_id");
CREATE INDEX "comments_post_id_idx" ON "comments"("post_id");
CREATE INDEX "comments_parent_comment_id_idx" ON "comments"("parent_comment_id");
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");
CREATE INDEX "selection_targets_debate_id_idx" ON "selection_targets"("debate_id");
CREATE INDEX "selection_targets_creator_id_idx" ON "selection_targets"("creator_id");
CREATE INDEX "selection_targets_source_type_source_id_idx" ON "selection_targets"("source_type", "source_id");
CREATE INDEX "consensuses_debate_id_idx" ON "consensuses"("debate_id");
CREATE INDEX "consensuses_selection_target_id_idx" ON "consensuses"("selection_target_id");
CREATE INDEX "consensuses_creator_id_idx" ON "consensuses"("creator_id");
CREATE UNIQUE INDEX "consensus_votes_consensus_id_user_id_key" ON "consensus_votes"("consensus_id", "user_id");
CREATE INDEX "consensus_votes_user_id_idx" ON "consensus_votes"("user_id");

ALTER TABLE "debates" ADD CONSTRAINT "debates_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "debates" ADD CONSTRAINT "debates_parent_debate_id_fkey" FOREIGN KEY ("parent_debate_id") REFERENCES "debates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "debates" ADD CONSTRAINT "debates_source_selection_target_id_fkey" FOREIGN KEY ("source_selection_target_id") REFERENCES "selection_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "debate_tag_maps" ADD CONSTRAINT "debate_tag_maps_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debate_tag_maps" ADD CONSTRAINT "debate_tag_maps_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "debate_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "debate_participants" ADD CONSTRAINT "debate_participants_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debate_participants" ADD CONSTRAINT "debate_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "selection_targets" ADD CONSTRAINT "selection_targets_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "selection_targets" ADD CONSTRAINT "selection_targets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consensuses" ADD CONSTRAINT "consensuses_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consensuses" ADD CONSTRAINT "consensuses_selection_target_id_fkey" FOREIGN KEY ("selection_target_id") REFERENCES "selection_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consensuses" ADD CONSTRAINT "consensuses_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consensus_votes" ADD CONSTRAINT "consensus_votes_consensus_id_fkey" FOREIGN KEY ("consensus_id") REFERENCES "consensuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consensus_votes" ADD CONSTRAINT "consensus_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "definitions" ADD CONSTRAINT "definitions_source_debate_id_fkey" FOREIGN KEY ("source_debate_id") REFERENCES "debates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "definitions" ADD CONSTRAINT "definitions_source_consensus_id_fkey" FOREIGN KEY ("source_consensus_id") REFERENCES "consensuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "definitions" ADD CONSTRAINT "definitions_selection_target_id_fkey" FOREIGN KEY ("selection_target_id") REFERENCES "selection_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "definitions" ADD CONSTRAINT "definitions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "definition_terms" ADD CONSTRAINT "definition_terms_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

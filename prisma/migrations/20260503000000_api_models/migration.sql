/*
  This migration rebuilds the initial MVP schema around UUID identifiers,
  matching the API contract documented in Notion.
*/

DROP TABLE IF EXISTS "consensus_votes";
DROP TABLE IF EXISTS "consensuses";
DROP TABLE IF EXISTS "selection_targets";
DROP TABLE IF EXISTS "comments";
DROP TABLE IF EXISTS "posts";
DROP TABLE IF EXISTS "debates";
DROP TABLE IF EXISTS "users";

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "DebateType" AS ENUM ('FREE', 'CONSENSUS', 'PROS_CONS');
CREATE TYPE "CloseConditionType" AS ENUM ('TIME_LIMIT', 'MANUAL');
CREATE TYPE "DebateStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');
CREATE TYPE "PostStatus" AS ENUM ('VISIBLE', 'DELETED');
CREATE TYPE "CommentStatus" AS ENUM ('VISIBLE', 'DELETED');
CREATE TYPE "SelectionSource" AS ENUM ('POST', 'COMMENT');
CREATE TYPE "ConsensusStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "VoteType" AS ENUM ('APPROVE', 'REJECT', 'COMMENT');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "profileImage" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "debates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "debateType" "DebateType" NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "closeConditionType" "CloseConditionType",
    "closeAt" TIMESTAMP(3),
    "status" "DebateStatus" NOT NULL DEFAULT 'OPEN',
    "creatorId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "debates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'VISIBLE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'VISIBLE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "selection_targets" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "sourceType" "SelectionSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "selectedText" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "selection_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consensuses" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "selectionTargetId" TEXT,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ConsensusStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "consensuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consensus_votes" (
    "id" TEXT NOT NULL,
    "consensusId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" "VoteType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "consensus_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");
CREATE INDEX "debates_creatorId_idx" ON "debates"("creatorId");
CREATE INDEX "debates_status_idx" ON "debates"("status");
CREATE INDEX "posts_debateId_idx" ON "posts"("debateId");
CREATE INDEX "posts_authorId_idx" ON "posts"("authorId");
CREATE INDEX "comments_postId_idx" ON "comments"("postId");
CREATE INDEX "comments_parentCommentId_idx" ON "comments"("parentCommentId");
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");
CREATE UNIQUE INDEX "selection_targets_commentId_key" ON "selection_targets"("commentId");
CREATE INDEX "selection_targets_debateId_idx" ON "selection_targets"("debateId");
CREATE INDEX "selection_targets_sourceType_sourceId_idx" ON "selection_targets"("sourceType", "sourceId");
CREATE INDEX "consensuses_debateId_idx" ON "consensuses"("debateId");
CREATE INDEX "consensuses_selectionTargetId_idx" ON "consensuses"("selectionTargetId");
CREATE UNIQUE INDEX "consensus_votes_consensusId_userId_key" ON "consensus_votes"("consensusId", "userId");
CREATE INDEX "consensus_votes_userId_idx" ON "consensus_votes"("userId");

ALTER TABLE "debates" ADD CONSTRAINT "debates_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "debates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "debates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "selection_targets" ADD CONSTRAINT "selection_targets_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "debates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "selection_targets" ADD CONSTRAINT "selection_targets_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "selection_targets" ADD CONSTRAINT "selection_targets_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consensuses" ADD CONSTRAINT "consensuses_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "debates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consensuses" ADD CONSTRAINT "consensuses_selectionTargetId_fkey" FOREIGN KEY ("selectionTargetId") REFERENCES "selection_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consensuses" ADD CONSTRAINT "consensuses_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consensus_votes" ADD CONSTRAINT "consensus_votes_consensusId_fkey" FOREIGN KEY ("consensusId") REFERENCES "consensuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consensus_votes" ADD CONSTRAINT "consensus_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stage 8: reports, admin moderation and user sanctions

ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'USER';
ALTER TYPE "ModerationTargetType" ADD VALUE IF NOT EXISTS 'USER';
ALTER TYPE "ModerationTargetType" ADD VALUE IF NOT EXISTS 'REPORT';
ALTER TYPE "ModerationTargetType" ADD VALUE IF NOT EXISTS 'SANCTION';
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'NONE';
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'REJECT';
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'SANCTION';
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'REVOKE';

CREATE TYPE "ReportReason" AS ENUM (
  'SPAM',
  'ABUSE',
  'HATE',
  'SEXUAL',
  'VIOLENCE',
  'MISINFORMATION',
  'OFF_TOPIC',
  'ETC'
);

CREATE TYPE "ReportStatus_new" AS ENUM (
  'PENDING',
  'REVIEWING',
  'ACTION_TAKEN',
  'REJECTED',
  'DUPLICATE'
);

ALTER TABLE "reports"
  ADD COLUMN "debate_id" TEXT,
  ADD COLUMN "detail" TEXT,
  ADD COLUMN "target_content_snapshot" TEXT,
  ADD COLUMN "handled_by_id" TEXT,
  ADD COLUMN "handled_at" TIMESTAMP(3),
  ADD COLUMN "resolution_note" TEXT;

ALTER TABLE "reports"
  ALTER COLUMN "reason" TYPE "ReportReason"
  USING CASE
    WHEN "reason" IN ('SPAM', 'ABUSE', 'HATE', 'SEXUAL', 'VIOLENCE', 'MISINFORMATION', 'OFF_TOPIC', 'ETC')
      THEN "reason"::"ReportReason"
    ELSE 'ETC'::"ReportReason"
  END;

ALTER TABLE "reports"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ReportStatus_new"
  USING CASE
    WHEN "status" = 'OPEN' THEN 'PENDING'::"ReportStatus_new"
    WHEN "status" = 'RESOLVED' THEN 'ACTION_TAKEN'::"ReportStatus_new"
    ELSE "status"::text::"ReportStatus_new"
  END;

DROP TYPE "ReportStatus";
ALTER TYPE "ReportStatus_new" RENAME TO "ReportStatus";
ALTER TABLE "reports" ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE TYPE "SanctionType" AS ENUM (
  'WARNING',
  'WRITE_RESTRICTION',
  'DEBATE_CREATE_RESTRICTION',
  'TEMP_SUSPENSION',
  'PERMANENT_SUSPENSION'
);

CREATE TYPE "SanctionStatus" AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'REVOKED'
);

CREATE TABLE "sanctions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "report_id" TEXT,
  "moderator_id" TEXT NOT NULL,
  "type" "SanctionType" NOT NULL,
  "status" "SanctionStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "revoke_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sanctions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sanction_acknowledgements" (
  "id" TEXT NOT NULL,
  "sanction_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sanction_acknowledgements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "moderation_logs" ALTER COLUMN "debate_id" DROP NOT NULL;

CREATE UNIQUE INDEX "reports_reporter_id_target_type_target_id_key"
  ON "reports"("reporter_id", "target_type", "target_id");
CREATE INDEX "reports_handled_by_id_idx" ON "reports"("handled_by_id");
CREATE INDEX "sanctions_user_id_status_idx" ON "sanctions"("user_id", "status");
CREATE INDEX "sanctions_report_id_idx" ON "sanctions"("report_id");
CREATE INDEX "sanctions_moderator_id_idx" ON "sanctions"("moderator_id");
CREATE UNIQUE INDEX "sanction_acknowledgements_sanction_id_user_id_key"
  ON "sanction_acknowledgements"("sanction_id", "user_id");
CREATE INDEX "sanction_acknowledgements_user_id_idx" ON "sanction_acknowledgements"("user_id");

ALTER TABLE "reports"
  ADD CONSTRAINT "reports_handled_by_id_fkey"
  FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sanctions"
  ADD CONSTRAINT "sanctions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "sanctions_report_id_fkey"
  FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "sanctions_moderator_id_fkey"
  FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sanction_acknowledgements"
  ADD CONSTRAINT "sanction_acknowledgements_sanction_id_fkey"
  FOREIGN KEY ("sanction_id") REFERENCES "sanctions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "sanction_acknowledgements_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

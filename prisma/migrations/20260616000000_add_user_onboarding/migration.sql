ALTER TABLE "users"
  ADD COLUMN "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "onboarding_completed_at" TIMESTAMP(3),
  ADD COLUMN "onboarding_version" INTEGER NOT NULL DEFAULT 1;

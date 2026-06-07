ALTER TABLE "users"
ADD COLUMN "email_verified_at" TIMESTAMP(3),
ADD COLUMN "email_verification_token_hash" TEXT,
ADD COLUMN "email_verification_expires_at" TIMESTAMP(3);

CREATE INDEX "users_email_verification_token_hash_idx"
ON "users"("email_verification_token_hash");

UPDATE "users"
SET "email_verified_at" = "created_at"
WHERE "email_verified_at" IS NULL;

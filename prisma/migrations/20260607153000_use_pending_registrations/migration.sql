CREATE TABLE "pending_registrations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_registrations_email_key"
ON "pending_registrations"("email");

CREATE UNIQUE INDEX "pending_registrations_nickname_key"
ON "pending_registrations"("nickname");

CREATE UNIQUE INDEX "pending_registrations_token_hash_key"
ON "pending_registrations"("token_hash");

ALTER TABLE "users"
DROP COLUMN "email_verified_at",
DROP COLUMN "email_verification_token_hash",
DROP COLUMN "email_verification_expires_at";

CREATE TYPE "SupportInquiryCategory" AS ENUM (
  'BUG',
  'ACCOUNT',
  'DEBATE',
  'REPORT',
  'ETC'
);

CREATE TYPE "SupportInquiryStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED'
);

CREATE TABLE "support_inquiries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "category" "SupportInquiryCategory" NOT NULL DEFAULT 'ETC',
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "SupportInquiryStatus" NOT NULL DEFAULT 'PENDING',
  "admin_reply" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "support_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_inquiries_user_id_idx" ON "support_inquiries"("user_id");
CREATE INDEX "support_inquiries_status_idx" ON "support_inquiries"("status");
CREATE INDEX "support_inquiries_created_at_idx" ON "support_inquiries"("created_at");

ALTER TABLE "support_inquiries"
  ADD CONSTRAINT "support_inquiries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

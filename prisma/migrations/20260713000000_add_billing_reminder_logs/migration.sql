CREATE TABLE "billing_reminder_logs" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "recipient_email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
  "provider_response" JSONB,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "billing_reminder_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "billing_reminder_logs_client_id_idx" ON "billing_reminder_logs"("client_id");
CREATE INDEX "billing_reminder_logs_created_at_idx" ON "billing_reminder_logs"("created_at");

ALTER TABLE "billing_reminder_logs"
  ADD CONSTRAINT "billing_reminder_logs_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

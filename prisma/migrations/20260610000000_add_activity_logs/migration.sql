-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "actor" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_invoice_id_idx" ON "activity_logs"("invoice_id");

-- CreateIndex
CREATE INDEX "activity_logs_event_idx" ON "activity_logs"("event");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN "billing_token" TEXT;
ALTER TABLE "clients" ADD COLUMN "billing_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "clients" ADD COLUMN "grace_period_days" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "clients_billing_token_key" ON "clients"("billing_token");

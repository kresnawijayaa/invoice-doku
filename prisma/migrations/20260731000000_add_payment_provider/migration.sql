CREATE TYPE "PaymentProvider" AS ENUM ('DOKU', 'MIDTRANS');

ALTER TABLE "invoices"
ADD COLUMN "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'DOKU';

ALTER TABLE "recurring_invoice_plans"
ADD COLUMN "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'DOKU';

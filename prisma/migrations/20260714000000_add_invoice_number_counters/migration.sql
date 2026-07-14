CREATE TABLE "invoice_number_counters" (
  "id" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invoice_number_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoice_number_counters_prefix_key" ON "invoice_number_counters"("prefix");

INSERT INTO "invoice_number_counters" ("id", "prefix", "last_number", "updated_at")
SELECT
  'counter_' || md5(regexp_replace("invoice_number", '-[0-9]{3}$', '')),
  regexp_replace("invoice_number", '-[0-9]{3}$', ''),
  max(substring("invoice_number" from '([0-9]{3})$')::integer),
  CURRENT_TIMESTAMP
FROM "invoices"
WHERE "invoice_number" ~ '-[0-9]{3}$'
GROUP BY regexp_replace("invoice_number", '-[0-9]{3}$', '');

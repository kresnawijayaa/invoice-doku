-- CreateTable
CREATE TABLE "recurring_invoice_plans" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title_template" TEXT NOT NULL,
    "notes" TEXT,
    "issue_day" INTEGER NOT NULL DEFAULT 1,
    "due_day" INTEGER NOT NULL DEFAULT 10,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_generated_period" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_invoice_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoice_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_invoice_plans_client_id_idx" ON "recurring_invoice_plans"("client_id");

-- CreateIndex
CREATE INDEX "recurring_invoice_plans_is_active_idx" ON "recurring_invoice_plans"("is_active");

-- CreateIndex
CREATE INDEX "recurring_invoice_items_plan_id_idx" ON "recurring_invoice_items"("plan_id");

-- AddForeignKey
ALTER TABLE "recurring_invoice_plans" ADD CONSTRAINT "recurring_invoice_plans_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_items" ADD CONSTRAINT "recurring_invoice_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "recurring_invoice_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/services/activity-log";
import { generateAllRecurringInvoices, generateInvoiceFromRecurringPlan } from "@/services/recurring-invoices";

const recurringPlanSchema = z.object({
  clientId: z.string().min(1, "Client wajib dipilih."),
  name: z.string().trim().min(1, "Nama plan wajib diisi."),
  titleTemplate: z.string().trim().min(1, "Template judul wajib diisi."),
  issueDay: z.coerce.number().int().min(1).max(28).default(1),
  dueDay: z.coerce.number().int().min(1).max(28).default(10),
  taxAmount: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional()
});

function parsePlanItems(formData: FormData, errorPath: string) {
  const descriptions = formData.getAll("itemDescription").map(String);
  const quantities = formData.getAll("itemQuantity").map(Number);
  const unitPrices = formData.getAll("itemUnitPrice").map(Number);
  const items = descriptions
    .map((description, index) => ({
      description: description.trim(),
      quantity: quantities[index],
      unitPrice: unitPrices[index]
    }))
    .filter((item) => item.description);

  if (items.length === 0) {
    redirect(`${errorPath}?error=${encodeURIComponent("Minimal satu item tagihan wajib diisi.")}`);
  }

  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      redirect(`${errorPath}?error=${encodeURIComponent("Qty dan harga item harus valid.")}`);
    }
  }

  return items;
}

export async function createRecurringPlanAction(formData: FormData) {
  const parsed = recurringPlanSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    titleTemplate: formData.get("titleTemplate"),
    issueDay: formData.get("issueDay"),
    dueDay: formData.get("dueDay"),
    taxAmount: formData.get("taxAmount") || 0,
    discountAmount: formData.get("discountAmount") || 0,
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Input recurring plan tidak valid.";
    redirect(`/recurring/create?error=${encodeURIComponent(message)}`);
  }

  const items = parsePlanItems(formData, "/recurring/create");
  const plan = await prisma.recurringInvoicePlan.create({
    data: {
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      titleTemplate: parsed.data.titleTemplate,
      issueDay: parsed.data.issueDay,
      dueDay: parsed.data.dueDay,
      taxAmount: parsed.data.taxAmount,
      discountAmount: parsed.data.discountAmount,
      notes: parsed.data.notes || null,
      isActive: true,
      items: {
        create: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      }
    },
    select: {
      id: true
    }
  });

  await createActivityLog({
    actor: "admin",
    event: "recurring.plan_created",
    message: `Recurring plan ${parsed.data.name} dibuat.`,
    metadata: {
      planId: plan.id,
      clientId: parsed.data.clientId
    }
  });

  revalidatePath("/recurring");
  redirect(`/recurring/${plan.id}?success=created`);
}

export async function generateRecurringPlanInvoiceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/recurring?error=Recurring plan tidak ditemukan.");
  }

  let invoiceId: string;

  try {
    const invoice = await generateInvoiceFromRecurringPlan(id);
    invoiceId = invoice.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal generate invoice recurring.";

    redirect(`/recurring/${id}?error=${encodeURIComponent(message)}`);
  }

    revalidatePath("/recurring");
    revalidatePath(`/recurring/${id}`);
    revalidatePath("/invoices");
  redirect(`/recurring/${id}?success=generated&invoice=${invoiceId}`);
}

export async function generateAllRecurringInvoicesAction() {
  const results = await generateAllRecurringInvoices();
  const successCount = results.filter((result) => result.ok).length;

  revalidatePath("/recurring");
  revalidatePath("/invoices");
  redirect(`/recurring?success=generated-all&count=${successCount}`);
}

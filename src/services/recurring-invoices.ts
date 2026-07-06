import "server-only";

import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/services/activity-log";
import { generateInvoiceNumber } from "@/services/invoice-number";

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];

function clampDay(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  return Math.min(Math.max(day, 1), lastDay);
}

export function getCurrentBillingPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function renderTitle(template: string, date: Date) {
  const month = monthNames[date.getMonth()];
  const year = String(date.getFullYear());

  return template.replaceAll("{bulan}", month).replaceAll("{tahun}", year).replaceAll("{month}", month).replaceAll("{year}", year);
}

export async function generateInvoiceFromRecurringPlan(planId: string, date = new Date()) {
  const period = getCurrentBillingPeriod(date);
  const plan = await prisma.recurringInvoicePlan.findUnique({
    where: { id: planId },
    include: {
      client: true,
      items: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!plan) {
    throw new Error("Recurring plan tidak ditemukan.");
  }

  if (!plan.isActive) {
    throw new Error("Recurring plan tidak aktif.");
  }

  if (plan.lastGeneratedPeriod === period) {
    throw new Error(`Invoice untuk periode ${period} sudah pernah digenerate.`);
  }

  if (plan.items.length === 0) {
    throw new Error("Recurring plan belum memiliki item tagihan.");
  }

  const issueDate = new Date(date.getFullYear(), date.getMonth(), clampDay(date.getFullYear(), date.getMonth(), plan.issueDay));
  const dueDate = new Date(date.getFullYear(), date.getMonth(), clampDay(date.getFullYear(), date.getMonth(), plan.dueDay));
  const items = plan.items.map((item) => {
    const quantity = Number(item.quantity.toString());
    const unitPrice = Number(item.unitPrice.toString());

    return {
      description: item.description,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = Number(plan.taxAmount.toString());
  const discountAmount = Number(plan.discountAmount.toString());
  const totalAmount = subtotal + taxAmount - discountAmount;

  if (totalAmount < 0) {
    throw new Error("Total invoice recurring tidak boleh negatif.");
  }

  const invoiceNumber = await generateInvoiceNumber(plan.clientId, issueDate);
  const publicToken = crypto.randomBytes(24).toString("hex");

  const invoice = await prisma.$transaction(async (tx) => {
    const createdInvoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        clientId: plan.clientId,
        title: renderTitle(plan.titleTemplate, date),
        notes: plan.notes,
        issueDate,
        dueDate,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        status: "UNPAID",
        publicToken,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          }))
        }
      },
      select: {
        id: true,
        invoiceNumber: true
      }
    });

    await tx.recurringInvoicePlan.update({
      where: { id: plan.id },
      data: {
        lastGeneratedPeriod: period
      }
    });

    return createdInvoice;
  });

  await createActivityLog({
    invoiceId: invoice.id,
    actor: "admin",
    event: "recurring.invoice_generated",
    message: `Invoice recurring ${period} dibuat dari plan ${plan.name}.`,
    metadata: {
      planId: plan.id,
      period,
      invoiceNumber: invoice.invoiceNumber
    } satisfies Prisma.InputJsonObject
  });

  return invoice;
}

export async function generateAllRecurringInvoices(date = new Date()) {
  const plans = await prisma.recurringInvoicePlan.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true
    }
  });
  const results = [];

  for (const plan of plans) {
    try {
      const invoice = await generateInvoiceFromRecurringPlan(plan.id, date);
      results.push({ planId: plan.id, ok: true, invoiceId: invoice.id });
    } catch (error) {
      results.push({
        planId: plan.id,
        ok: false,
        error: error instanceof Error ? error.message : "Gagal generate invoice recurring."
      });
    }
  }

  return results;
}

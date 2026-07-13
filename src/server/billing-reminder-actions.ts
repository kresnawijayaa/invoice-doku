"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientBillingByToken } from "@/services/billing";
import { sendBillingReminderEmail } from "@/services/email";

const REMINDER_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_REMINDERS_PER_DAY = 3;

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getBillingReminderLimit(clientId: string) {
  const todayStart = getTodayStart();
  const [sentToday, latestSent] = await Promise.all([
    prisma.billingReminderLog.count({
      where: {
        clientId,
        status: "SENT",
        createdAt: {
          gte: todayStart
        }
      }
    }),
    prisma.billingReminderLog.findFirst({
      where: {
        clientId,
        status: "SENT"
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        createdAt: true
      }
    })
  ]);
  const nextAllowedAt = latestSent ? new Date(latestSent.createdAt.getTime() + REMINDER_COOLDOWN_MS) : null;
  const cooldownActive = nextAllowedAt ? nextAllowedAt > new Date() : false;

  return {
    sentToday,
    remainingToday: Math.max(0, MAX_REMINDERS_PER_DAY - sentToday),
    maxPerDay: MAX_REMINDERS_PER_DAY,
    nextAllowedAt: cooldownActive ? nextAllowedAt : null,
    canSend: sentToday < MAX_REMINDERS_PER_DAY && !cooldownActive
  };
}

function buildRedirect(token: string, status: "sent" | "limited" | "error", message?: string) {
  const params = new URLSearchParams({ status });

  if (message) {
    params.set("message", message);
  }

  return `/billing/${token}/blocked?${params.toString()}`;
}

export async function sendBillingReminderAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  if (!token) {
    redirect("/billing?error=Token billing tidak valid.");
  }

  const billing = await getClientBillingByToken(token);

  if (!billing) {
    redirect(buildRedirect(token, "error", "Billing client tidak ditemukan."));
  }

  const limit = await getBillingReminderLimit(billing.client.id);

  if (!limit.canSend) {
    redirect(buildRedirect(token, "limited"));
  }

  const billingUrl = billing.billingUrl;
  const overdueTitles = billing.overdueInvoices.map((invoice) => invoice.title);
  const subject = `Informasi Billing - ${billing.client.companyName || billing.client.name}`;

  try {
    const result = await sendBillingReminderEmail({
      recipientEmail: billing.client.email,
      clientName: billing.client.name,
      companyName: billing.client.companyName,
      billingUrl,
      overdueTitles
    });

    await prisma.billingReminderLog.create({
      data: {
        clientId: billing.client.id,
        recipientEmail: billing.client.email,
        subject: result.subject,
        status: "SENT",
        providerResponse: result.response,
        sentAt: new Date()
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email reminder gagal dikirim.";

    await prisma.billingReminderLog.create({
      data: {
        clientId: billing.client.id,
        recipientEmail: billing.client.email,
        subject,
        status: "FAILED",
        providerResponse: {
          error: message
        } satisfies Prisma.InputJsonObject
      }
    });

    revalidatePath(`/billing/${token}/blocked`);
    redirect(buildRedirect(token, "error", message));
  }

  revalidatePath(`/billing/${token}/blocked`);
  redirect(buildRedirect(token, "sent"));
}

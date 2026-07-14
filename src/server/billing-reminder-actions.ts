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

function sanitizeTextParam(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeUrlParam(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  try {
    const url = new URL(rawValue);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    return url.toString().slice(0, 300);
  } catch {
    return "";
  }
}

function buildContextRedirect(token: string, status: "sent" | "limited" | "error", context: ReminderContext, message?: string) {
  const params = new URLSearchParams({ status });

  if (message) {
    params.set("message", message);
  }

  if (context.senderName) {
    params.set("senderName", context.senderName);
  }

  if (context.senderRole) {
    params.set("senderRole", context.senderRole);
  }

  if (context.sourceUrl) {
    params.set("sourceUrl", context.sourceUrl);
  }

  return `/billing/${token}/blocked?${params.toString()}`;
}

type ReminderContext = {
  senderName: string;
  senderRole: string;
  sourceUrl: string;
};

export async function sendBillingReminderAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const context = {
    senderName: sanitizeTextParam(formData.get("senderName"), 80),
    senderRole: sanitizeTextParam(formData.get("senderRole"), 80),
    sourceUrl: sanitizeUrlParam(formData.get("sourceUrl"))
  };

  if (!token) {
    redirect("/billing?error=Token billing tidak valid.");
  }

  const billing = await getClientBillingByToken(token);

  if (!billing) {
    redirect(buildRedirect(token, "error", "Billing client tidak ditemukan."));
  }

  const limit = await getBillingReminderLimit(billing.client.id);

  if (!limit.canSend) {
    redirect(buildContextRedirect(token, "limited", context));
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
      overdueTitles,
      senderName: context.senderName,
      senderRole: context.senderRole,
      sourceUrl: context.sourceUrl
    });

    await prisma.billingReminderLog.create({
      data: {
        clientId: billing.client.id,
        recipientEmail: billing.client.email,
        subject: result.subject,
        status: "SENT",
        providerResponse: {
          result: result.response,
          reminderContext: context
        },
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
          error: message,
          reminderContext: context
        } satisfies Prisma.InputJsonObject
      }
    });

    revalidatePath(`/billing/${token}/blocked`);
    redirect(buildContextRedirect(token, "error", context, message));
  }

  revalidatePath(`/billing/${token}/blocked`);
  redirect(buildContextRedirect(token, "sent", context));
}

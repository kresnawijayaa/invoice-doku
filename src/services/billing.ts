import "server-only";

import { prisma } from "@/lib/prisma";

const OPEN_BILLING_STATUSES = ["SENT", "UNPAID", "OVERDUE"] as const;

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function isPastDueDate(dueDate: Date, gracePeriodDays: number) {
  const blockFrom = new Date(dueDate);
  blockFrom.setDate(blockFrom.getDate() + gracePeriodDays + 1);
  blockFrom.setHours(0, 0, 0, 0);

  return new Date() >= blockFrom;
}

function getDaysUntilDue(dueDate: Date) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffMs = dueStart.getTime() - todayStart.getTime();

  return Math.ceil(diffMs / 86_400_000);
}

export async function getClientBillingByToken(token: string) {
  const client = await prisma.client.findUnique({
    where: { billingToken: token },
    include: {
      invoices: {
        orderBy: { dueDate: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          title: true,
          issueDate: true,
          dueDate: true,
          totalAmount: true,
          status: true,
          publicToken: true,
          paidAt: true
        }
      }
    }
  });

  if (!client) {
    return null;
  }

  const appUrl = getAppUrl();
  const openInvoices = client.invoices.filter((invoice) => OPEN_BILLING_STATUSES.includes(invoice.status as (typeof OPEN_BILLING_STATUSES)[number]));
  const overdueInvoices = openInvoices.filter(
    (invoice) => invoice.status === "OVERDUE" || isPastDueDate(invoice.dueDate, client.gracePeriodDays)
  );
  const warningInvoices = openInvoices
    .filter((invoice) => !overdueInvoices.some((overdueInvoice) => overdueInvoice.id === invoice.id))
    .map((invoice) => ({
      ...invoice,
      daysUntilDue: getDaysUntilDue(invoice.dueDate)
    }))
    .filter((invoice) => invoice.daysUntilDue >= 0)
    .sort((left, right) => left.daysUntilDue - right.daysUntilDue);
  const paidInvoices = client.invoices.filter((invoice) => invoice.status === "PAID");
  const allowed = !client.billingEnabled || overdueInvoices.length === 0;
  const status = !client.billingEnabled ? "BILLING_DISABLED" : !allowed ? "BLOCKED_OVERDUE" : warningInvoices.length > 0 ? "WARNING_DUE" : "ACTIVE";
  const action = !client.billingEnabled ? "ALLOW" : !allowed ? "BLOCK" : warningInvoices.length > 0 ? "WARN" : "ALLOW";

  return {
    client,
    allowed,
    action,
    status,
    billingUrl: `${appUrl}/billing/${token}`,
    openInvoices,
    overdueInvoices,
    warningInvoices,
    nearestDueInvoice: warningInvoices[0] ?? null,
    paidInvoices
  };
}

export function toBillingStatusResponse(data: NonNullable<Awaited<ReturnType<typeof getClientBillingByToken>>>) {
  return {
    allowed: data.allowed,
    action: data.action,
    status: data.status,
    client: {
      name: data.client.name,
      companyName: data.client.companyName,
      email: data.client.email,
      billingEnabled: data.client.billingEnabled,
      gracePeriodDays: data.client.gracePeriodDays
    },
    billingUrl: data.billingUrl,
    warning: data.nearestDueInvoice
      ? {
          invoiceNumber: data.nearestDueInvoice.invoiceNumber,
          title: data.nearestDueInvoice.title,
          dueDate: data.nearestDueInvoice.dueDate.toISOString(),
          daysUntilDue: data.nearestDueInvoice.daysUntilDue,
          totalAmount: Number(data.nearestDueInvoice.totalAmount.toString()),
          invoiceUrl: `${getAppUrl()}/invoice/${data.nearestDueInvoice.publicToken}`
        }
      : null,
    overdueInvoices: data.overdueInvoices.map((invoice) => ({
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      totalAmount: Number(invoice.totalAmount.toString()),
      status: invoice.status,
      invoiceUrl: `${getAppUrl()}/invoice/${invoice.publicToken}`
    })),
    openInvoices: data.openInvoices.map((invoice) => ({
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      totalAmount: Number(invoice.totalAmount.toString()),
      status: invoice.status,
      invoiceUrl: `${getAppUrl()}/invoice/${invoice.publicToken}`
    }))
  };
}

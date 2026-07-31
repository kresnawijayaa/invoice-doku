import "server-only";

import crypto from "crypto";
import type { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/services/activity-log";
import { sendPaymentReceiptEmail } from "@/services/email";

type MidtransNotification = {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  transaction_time?: string;
  settlement_time?: string;
  status_code?: string;
  gross_amount?: string;
  fraud_status?: string;
  payment_type?: string;
  signature_key?: string;
  status_message?: string;
  [key: string]: unknown;
};

type MidtransSnapResponse = {
  token?: string;
  redirect_url?: string;
  error_messages?: string[];
};

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  const environment = process.env.MIDTRANS_ENV?.trim().toLowerCase() ?? "sandbox";
  const production = environment === "production";

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  }

  return {
    serverKey,
    snapBaseUrl: production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com",
    apiBaseUrl: production ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com"
  };
}

function authorizationHeader(serverKey: string) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

function toIntegerAmount(value: Prisma.Decimal) {
  return Math.round(Number(value.toString()));
}

function parseMidtransDate(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "+07:00";
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function mapMidtransStatus(payload: MidtransNotification): PaymentStatus {
  const status = payload.transaction_status?.toLowerCase();
  const fraudStatus = payload.fraud_status?.toLowerCase();

  const successfulStatusCode = payload.status_code === "200";

  if (
    successfulStatusCode &&
    (status === "settlement" || (status === "capture" && (!fraudStatus || fraudStatus === "accept")))
  ) {
    return "PAID";
  }

  if (status === "expire") {
    return "EXPIRED";
  }

  if (status === "cancel") {
    return "CANCELLED";
  }

  if (status === "deny" || status === "failure") {
    return "FAILED";
  }

  return "PENDING";
}

export async function createMidtransPayment(invoiceId: string) {
  const existingPayment = await prisma.payment.findFirst({
    where: {
      invoiceId,
      provider: "MIDTRANS",
      status: "PENDING",
      paymentUrl: { not: null }
    },
    orderBy: { createdAt: "desc" }
  });

  if (existingPayment?.paymentUrl) {
    return existingPayment.paymentUrl;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      items: { orderBy: { createdAt: "asc" } },
      payments: {
        where: { provider: "MIDTRANS" },
        select: { id: true }
      }
    }
  });

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan.");
  }

  if (invoice.paymentProvider !== "MIDTRANS") {
    throw new Error("Invoice ini tidak menggunakan Midtrans.");
  }

  if (invoice.status === "PAID") {
    throw new Error("Invoice sudah dibayar.");
  }

  const amount = toIntegerAmount(invoice.totalAmount);
  if (amount <= 0) {
    throw new Error("Total invoice harus lebih dari Rp 0.");
  }

  const { serverKey, snapBaseUrl } = getMidtransConfig();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const notificationUrl = process.env.MIDTRANS_NOTIFICATION_URL?.trim();
  const attempt = invoice.payments.length + 1;
  const orderId = `${invoice.invoiceNumber}-M${attempt}`.slice(0, 50);
  const requestBody = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount
    },
    customer_details: {
      first_name: invoice.client.name.slice(0, 50),
      email: invoice.client.email,
      ...(invoice.client.phone ? { phone: invoice.client.phone } : {})
    },
    callbacks: {
      finish: `${appUrl}/invoice/${invoice.publicToken}/success`,
      error: `${appUrl}/invoice/${invoice.publicToken}/failed`,
      pending: `${appUrl}/invoice/${invoice.publicToken}/success`
    }
  };

  const response = await fetch(`${snapBaseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: authorizationHeader(serverKey),
      "Content-Type": "application/json",
      ...(notificationUrl ? { "X-Override-Notification": notificationUrl } : {})
    },
    body: JSON.stringify(requestBody),
    cache: "no-store"
  });
  const responseJson = (await response.json()) as MidtransSnapResponse;

  if (!response.ok || !responseJson.redirect_url) {
    const message = responseJson.error_messages?.join(", ") || `Midtrans mengembalikan HTTP ${response.status}.`;

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        provider: "MIDTRANS",
        providerTransactionId: orderId,
        amount: invoice.totalAmount,
        status: "FAILED",
        rawRequest: requestBody,
        rawCallback: toJson(responseJson)
      }
    });

    await createActivityLog({
      invoiceId: invoice.id,
      actor: "system",
      event: "payment.create_failed",
      message,
      metadata: toJson({ provider: "MIDTRANS", orderId, response: responseJson })
    });

    throw new Error(message);
  }

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      provider: "MIDTRANS",
      providerTransactionId: orderId,
      paymentUrl: responseJson.redirect_url,
      amount: invoice.totalAmount,
      status: "PENDING",
      rawRequest: requestBody,
      rawCallback: toJson(responseJson)
    }
  });

  await createActivityLog({
    invoiceId: invoice.id,
    actor: "system",
    event: "payment.created",
    message: "Payment request Midtrans dibuat.",
    metadata: { provider: "MIDTRANS", orderId }
  });

  return responseJson.redirect_url;
}

export function verifyMidtransNotification(payload: MidtransNotification) {
  const { serverKey } = getMidtransConfig();
  const source = `${payload.order_id ?? ""}${payload.status_code ?? ""}${payload.gross_amount ?? ""}${serverKey}`;
  const expected = crypto.createHash("sha512").update(source).digest("hex");
  const actual = payload.signature_key ?? "";
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

async function applyMidtransUpdate(payload: MidtransNotification) {
  const orderId = payload.order_id;
  if (!orderId) {
    throw new Error("Payload Midtrans tidak memiliki order_id.");
  }

  const payment = await prisma.payment.findFirst({
    where: {
      provider: "MIDTRANS",
      providerTransactionId: orderId
    },
    include: {
      invoice: {
        include: { client: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!payment) {
    throw new Error(`Payment Midtrans ${orderId} tidak ditemukan.`);
  }

  const callbackAmount = Number(payload.gross_amount);
  const expectedAmount = Number(payment.amount.toString());
  if (!Number.isFinite(callbackAmount) || callbackAmount !== expectedAmount) {
    throw new Error("Nominal callback Midtrans tidak sesuai dengan invoice.");
  }

  const mappedStatus = mapMidtransStatus(payload);
  const paymentStatus = payment.status === "PAID" && mappedStatus !== "PAID" ? "PAID" : mappedStatus;
  const becamePaid = payment.status !== "PAID" && paymentStatus === "PAID";
  const paidAt =
    paymentStatus === "PAID"
      ? mappedStatus === "PAID"
        ? parseMidtransDate(payload.settlement_time) ?? parseMidtransDate(payload.transaction_time) ?? payment.paidAt ?? new Date()
        : payment.paidAt
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        providerTransactionId: orderId,
        paymentMethod: payload.payment_type ?? null,
        paidAt,
        rawCallback: toJson(payload)
      }
    });

    if (paymentStatus === "PAID") {
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: "PAID", paidAt }
      });
    } else if (payment.invoice.status !== "PAID" && paymentStatus === "EXPIRED") {
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: "OVERDUE" }
      });
    }
  });

  await createActivityLog({
    invoiceId: payment.invoiceId,
    actor: "midtrans",
    event: "payment.status_updated",
    message: `Status pembayaran Midtrans: ${paymentStatus}.`,
    metadata: toJson({
      orderId,
      transactionId: payload.transaction_id,
      transactionStatus: payload.transaction_status,
      paymentStatus,
      paymentMethod: payload.payment_type
    })
  });

  return {
    invoiceId: payment.invoiceId,
    invoice: payment.invoice,
    paymentStatus,
    paidAt,
    paymentMethod: payload.payment_type ?? null,
    becamePaid,
    orderId
  };
}

export async function handleMidtransNotification(payload: MidtransNotification) {
  const result = await applyMidtransUpdate(payload);
  await maybeSendPaymentReceipt(result);
  return {
    invoiceId: result.invoiceId,
    paymentStatus: result.paymentStatus,
    orderId: result.orderId
  };
}

function shouldSendPaymentReceiptEmail() {
  return process.env.EMAIL_SEND_PAYMENT_RECEIPT?.trim().toLowerCase() === "true";
}

async function maybeSendPaymentReceipt(input: Awaited<ReturnType<typeof applyMidtransUpdate>>) {
  if (!shouldSendPaymentReceiptEmail() || !input.becamePaid || !input.paidAt) {
    return;
  }

  const existingReceipt = await prisma.emailLog.findFirst({
    where: {
      invoiceId: input.invoiceId,
      status: "SENT",
      subject: { startsWith: "Pembayaran Diterima" }
    },
    select: { id: true }
  });

  if (existingReceipt) {
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${appUrl}/invoice/${input.invoice.publicToken}`;
  const subject = `Pembayaran Diterima - Invoice ${input.invoice.invoiceNumber}`;

  try {
    const result = await sendPaymentReceiptEmail({
      recipientEmail: input.invoice.client.email,
      clientName: input.invoice.client.name,
      companyName: input.invoice.client.companyName,
      invoiceNumber: input.invoice.invoiceNumber,
      invoiceTitle: input.invoice.title,
      totalAmount: input.invoice.totalAmount.toString(),
      paidAt: input.paidAt,
      paymentMethod: input.paymentMethod,
      publicUrl
    });

    await prisma.emailLog.create({
      data: {
        invoiceId: input.invoiceId,
        recipientEmail: input.invoice.client.email,
        subject: result.subject,
        status: "SENT",
        providerResponse: result.response,
        sentAt: new Date()
      }
    });
  } catch (error) {
    await prisma.emailLog.create({
      data: {
        invoiceId: input.invoiceId,
        recipientEmail: input.invoice.client.email,
        subject,
        status: "FAILED",
        providerResponse: {
          error: error instanceof Error ? error.message : "Email receipt gagal dikirim."
        }
      }
    });
  }
}

export async function getMidtransPaymentStatus(orderId: string) {
  const { serverKey, apiBaseUrl } = getMidtransConfig();
  const response = await fetch(`${apiBaseUrl}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: {
      Accept: "application/json",
      Authorization: authorizationHeader(serverKey)
    },
    cache: "no-store"
  });
  const responseJson = (await response.json()) as MidtransNotification;

  if (!response.ok) {
    throw new Error(responseJson.status_message || `Midtrans mengembalikan HTTP ${response.status}.`);
  }

  return responseJson;
}

export async function syncMidtransPaymentStatus(invoiceId: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      invoiceId,
      provider: "MIDTRANS",
      providerTransactionId: { not: null }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!payment?.providerTransactionId) {
    throw new Error("Belum ada transaksi Midtrans untuk invoice ini.");
  }

  const payload = await getMidtransPaymentStatus(payment.providerTransactionId);
  const result = await applyMidtransUpdate(payload);
  await maybeSendPaymentReceipt(result);

  return {
    paymentStatus: result.paymentStatus,
    orderId: result.orderId
  };
}

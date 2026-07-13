import "server-only";

import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/services/activity-log";
import { sendPaymentReceiptEmail } from "@/services/email";

const CHECKOUT_TARGET = "/checkout/v1/payment";
const STATUS_TARGET_PREFIX = "/orders/v1/status";
const WEBHOOK_TARGET = "/api/webhooks/doku";

type DokuInvoice = Prisma.InvoiceGetPayload<{
  include: {
    client: true;
    items: true;
  };
}>;

type DokuPaymentResponse = {
  message?: string[];
  response?: {
    error?: {
      code?: string;
      type?: string;
      message?: string;
    };
    order?: {
      invoice_number?: string;
      session_id?: string;
    };
    payment?: {
      token_id?: string;
      url?: string;
      expired_date?: string;
    };
    uuid?: string | number;
  };
  error_messages?: string[];
};

type DokuCallbackPayload = {
  service?: {
    id?: string;
  };
  acquirer?: {
    id?: string;
  };
  channel?: {
    id?: string;
  };
  order?: {
    invoice_number?: string;
    amount?: string | number;
  };
  transaction?: {
    status?: string;
    date?: string;
    original_request_id?: string;
    type?: string;
  };
  virtual_account_payment?: {
    identifier?: unknown;
  };
  online_to_offline_payment?: {
    identifier?: unknown;
  };
  qr_payment?: {
    identifier?: unknown;
  };
  card_payment?: {
    masked_card?: string;
    approval_code?: string;
  };
  additional_info?: unknown;
  [key: string]: unknown;
};

type DokuStatusResponse = DokuCallbackPayload & {
  response?: {
    error?: {
      code?: string;
      type?: string;
      message?: string;
    };
  };
  error_messages?: string[];
  message?: string[];
};

function getDokuConfig() {
  const clientId = process.env.DOKU_CLIENT_ID?.trim();
  const secretKey = process.env.DOKU_SECRET_KEY?.trim();
  const env = process.env.DOKU_ENV?.trim() ?? "sandbox";

  if (!clientId) {
    throw new Error("DOKU_CLIENT_ID belum dikonfigurasi.");
  }

  if (!secretKey) {
    throw new Error("DOKU_SECRET_KEY belum dikonfigurasi.");
  }

  return {
    clientId,
    secretKey,
    baseUrl: env === "production" ? "https://api.doku.com" : "https://api-sandbox.doku.com"
  };
}

function getDokuErrorMessage(responseJson: DokuPaymentResponse) {
  const responseError = responseJson.response?.error;

  if (responseError?.message || responseError?.code) {
    return [responseError.code, responseError.message].filter(Boolean).join(": ");
  }

  return responseJson.error_messages?.join(", ") || responseJson.message?.join(", ") || "Gagal membuat pembayaran DOKU.";
}

function createRequestTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function createDigest(body: string) {
  return crypto.createHash("sha256").update(body).digest("base64");
}

function createSignature(input: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  digest?: string;
  secretKey: string;
}) {
  const component = [
    `Client-Id:${input.clientId}`,
    `Request-Id:${input.requestId}`,
    `Request-Timestamp:${input.requestTimestamp}`,
    `Request-Target:${input.requestTarget}`,
    input.digest ? `Digest:${input.digest}` : null
  ]
    .filter(Boolean)
    .join("\n");

  const signature = crypto.createHmac("sha256", input.secretKey).update(component).digest("base64");

  return `HMACSHA256=${signature}`;
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getHeader(headers: Headers, key: string) {
  return headers.get(key) ?? headers.get(key.toLowerCase()) ?? "";
}

function replaceTokenTemplate(value: string | undefined, token: string) {
  return value?.replace("{token}", token);
}

function getRedirectUrl(kind: "success" | "failed", token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fallback = `${appUrl}/invoice/${token}/${kind}`;
  const configured =
    kind === "success"
      ? replaceTokenTemplate(process.env.DOKU_SUCCESS_REDIRECT_URL, token)
      : replaceTokenTemplate(process.env.DOKU_FAILED_REDIRECT_URL, token);

  return configured || fallback;
}

function toIntegerAmount(value: Prisma.Decimal) {
  return Math.round(Number(value.toString()));
}

const DOKU_TEXT_DISALLOWED_PATTERN = /[^a-zA-Z0-9 .\-\/+,=_'@%]/g;

function sanitizeDokuText(value: string | null | undefined, fallback: string) {
  const sanitized = (value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(DOKU_TEXT_DISALLOWED_PATTERN, "")
    .trim();

  return sanitized || fallback;
}

function sanitizeDokuPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");

  if (!digits) {
    return undefined;
  }

  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("8") ? `62${digits}` : digits;

  if (normalized.length < 8 || normalized.length > 15) {
    return undefined;
  }

  return normalized;
}

function buildCheckoutBody(invoice: DokuInvoice) {
  const callbackSuccess = getRedirectUrl("success", invoice.publicToken);
  const callbackFailed = getRedirectUrl("failed", invoice.publicToken);
  const notificationUrl = process.env.DOKU_CALLBACK_URL;

  return {
    order: {
      amount: toIntegerAmount(invoice.totalAmount),
      invoice_number: invoice.invoiceNumber,
      currency: "IDR",
      callback_url: callbackSuccess,
      callback_url_cancel: callbackFailed,
      callback_url_result: callbackSuccess,
      language: "ID",
      auto_redirect: true,
      disable_retry_payment: false,
      line_items: invoice.items.map((item, index) => ({
        id: String(index + 1).padStart(3, "0"),
        name: sanitizeDokuText(item.description, `Item ${index + 1}`).slice(0, 255),
        quantity: Number(item.quantity.toString()),
        price: toIntegerAmount(item.unitPrice)
      }))
    },
    payment: {
      payment_due_date: 60,
      type: "SALE"
    },
    customer: {
      id: invoice.clientId,
      name: sanitizeDokuText(invoice.client.name, "Customer"),
      email: invoice.client.email,
      phone: sanitizeDokuPhone(invoice.client.phone),
      address: invoice.client.address ? sanitizeDokuText(invoice.client.address, "-") : undefined,
      country: "ID"
    },
    additional_info: notificationUrl
      ? {
          override_notification_url: notificationUrl
        }
      : undefined
  };
}

export async function createDokuPayment(invoiceId: string) {
  const existingPayment = await prisma.payment.findFirst({
    where: {
      invoiceId,
      provider: "DOKU",
      status: "PENDING",
      paymentUrl: {
        not: null
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existingPayment?.paymentUrl) {
    return existingPayment.paymentUrl;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      items: true
    }
  });

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan.");
  }

  if (invoice.status === "PAID") {
    throw new Error("Invoice ini sudah dibayar.");
  }

  if (invoice.status === "CANCELLED") {
    throw new Error("Invoice ini sudah dibatalkan.");
  }

  const config = getDokuConfig();
  const requestId = crypto.randomUUID();
  const requestTimestamp = createRequestTimestamp();
  const body = buildCheckoutBody(invoice);
  const bodyJson = JSON.stringify(body);
  const digest = createDigest(bodyJson);
  const signature = createSignature({
    clientId: config.clientId,
    requestId,
    requestTimestamp,
    requestTarget: CHECKOUT_TARGET,
    digest,
    secretKey: config.secretKey
  });

  const response = await fetch(`${config.baseUrl}${CHECKOUT_TARGET}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": config.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": requestTimestamp,
      Signature: signature
    },
    body: bodyJson
  });
  const responseJson = (await response.json()) as DokuPaymentResponse;

  if (!response.ok || !responseJson.response?.payment?.url) {
    const message = getDokuErrorMessage(responseJson);

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        provider: "DOKU",
        providerTransactionId: responseJson.response?.payment?.token_id || responseJson.response?.order?.session_id,
        amount: invoice.totalAmount,
        status: "FAILED",
        rawRequest: {
          requestId,
          requestTimestamp,
          requestTarget: CHECKOUT_TARGET,
          body
        },
        rawCallback: {
          response: responseJson,
          httpStatus: response.status
        }
      }
    });

    await createActivityLog({
      invoiceId: invoice.id,
      actor: "system",
      event: "payment.create_failed",
      message,
      metadata: {
        provider: "DOKU",
        httpStatus: response.status,
        requestId
      }
    });

    throw new Error(message);
  }

  const paymentUrl = responseJson.response.payment.url;
  const providerTransactionId =
    responseJson.response.payment.token_id || responseJson.response.order?.session_id || String(responseJson.response.uuid ?? requestId);

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      provider: "DOKU",
      providerTransactionId,
      paymentUrl,
      amount: invoice.totalAmount,
      status: "PENDING",
      rawRequest: {
        requestId,
        requestTimestamp,
        requestTarget: CHECKOUT_TARGET,
        body
      },
      rawCallback: {
        response: responseJson
      }
    }
  });

  await createActivityLog({
    invoiceId: invoice.id,
    actor: "system",
    event: "payment.created",
    message: "Payment request DOKU dibuat.",
    metadata: {
      provider: "DOKU",
      providerTransactionId,
      requestId
    }
  });

  return paymentUrl;
}

export function verifyDokuCallback(rawBody: string, headers: Headers) {
  const config = getDokuConfig();
  const clientId = getHeader(headers, "Client-Id");
  const requestId = getHeader(headers, "Request-Id");
  const requestTimestamp = getHeader(headers, "Request-Timestamp");
  const signature = getHeader(headers, "Signature");

  if (!clientId || !requestId || !requestTimestamp || !signature) {
    return false;
  }

  if (clientId !== config.clientId) {
    return false;
  }

  const expectedSignature = createSignature({
    clientId,
    requestId,
    requestTimestamp,
    requestTarget: WEBHOOK_TARGET,
    digest: createDigest(rawBody),
    secretKey: config.secretKey
  });

  return safeEquals(signature, expectedSignature);
}

function mapDokuPaymentStatus(status?: string) {
  switch (status) {
    case "SUCCESS":
      return "PAID";
    case "FAILED":
    case "TIMEOUT":
      return "FAILED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

function getPaymentMethod(payload: DokuCallbackPayload) {
  return [payload.service?.id, payload.acquirer?.id, payload.channel?.id].filter(Boolean).join(":") || null;
}

function parseDokuDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function shouldSendPaymentReceiptEmail() {
  return process.env.EMAIL_SEND_PAYMENT_RECEIPT === "true";
}

function getDokuStatusErrorMessage(responseJson: DokuStatusResponse) {
  const responseError = responseJson.response?.error;

  if (responseError?.message || responseError?.code) {
    return [responseError.code, responseError.message].filter(Boolean).join(": ");
  }

  return responseJson.error_messages?.join(", ") || responseJson.message?.join(", ") || "Gagal membaca status pembayaran DOKU.";
}

async function applyDokuPaymentUpdate(payload: DokuCallbackPayload) {
  const invoiceNumber = payload.order?.invoice_number;
  const dokuStatus = payload.transaction?.status;

  if (!invoiceNumber) {
    throw new Error("Payload DOKU tidak memiliki order.invoice_number.");
  }

  if (!dokuStatus) {
    throw new Error("Payload DOKU tidak memiliki transaction.status.");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber },
    include: {
      client: true,
      payments: {
        where: {
          provider: "DOKU"
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    }
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceNumber} tidak ditemukan.`);
  }

  const paymentStatus = mapDokuPaymentStatus(dokuStatus);
  const paidAt = paymentStatus === "PAID" ? parseDokuDate(payload.transaction?.date) ?? new Date() : null;
  const latestPayment = invoice.payments[0];
  const paymentMethod = getPaymentMethod(payload);
  const providerTransactionId = payload.transaction?.original_request_id || latestPayment?.providerTransactionId || null;
  const rawCallback = payload as Prisma.InputJsonValue;
  let becamePaid = false;

  await prisma.$transaction(async (tx) => {
    if (latestPayment) {
      await tx.payment.update({
        where: { id: latestPayment.id },
        data: {
          providerTransactionId,
          paymentMethod,
          status: paymentStatus,
          paidAt,
          rawCallback
        }
      });
    } else {
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          provider: "DOKU",
          providerTransactionId,
          paymentMethod,
          amount: invoice.totalAmount,
          status: paymentStatus,
          paidAt,
          rawCallback
        }
      });
    }

    if (paymentStatus === "PAID") {
      const updateResult = await tx.invoice.updateMany({
        where: {
          id: invoice.id,
          status: {
            not: "PAID"
          }
        },
        data: {
          status: "PAID",
          paidAt
        }
      });
      becamePaid = updateResult.count > 0;
    } else if (paymentStatus === "EXPIRED" && invoice.status !== "PAID") {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "OVERDUE"
        }
      });
    } else if (paymentStatus === "FAILED" && invoice.status !== "PAID") {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "UNPAID"
        }
      });
    }
  });

  await createActivityLog({
    invoiceId: invoice.id,
    actor: "doku",
    event: "payment.status_updated",
    message: `Status pembayaran DOKU: ${paymentStatus}.`,
    metadata: {
      dokuStatus,
      paymentStatus,
      paymentMethod,
      providerTransactionId,
      becamePaid
    }
  });

  return {
    invoice,
    invoiceNumber,
    paymentStatus,
    dokuStatus,
    paidAt,
    paymentMethod,
    becamePaid
  };
}

async function maybeSendPaymentReceipt(input: Awaited<ReturnType<typeof applyDokuPaymentUpdate>>) {
  if (!shouldSendPaymentReceiptEmail() || input.paymentStatus !== "PAID" || !input.paidAt || !input.becamePaid) {
    return;
  }

  const existingReceipt = await prisma.emailLog.findFirst({
    where: {
      invoiceId: input.invoice.id,
      status: "SENT",
      subject: {
        startsWith: "Pembayaran Diterima"
      }
    },
    select: {
      id: true
    }
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
          invoiceId: input.invoice.id,
          recipientEmail: input.invoice.client.email,
          subject: result.subject,
          status: "SENT",
          providerResponse: result.response,
          sentAt: new Date()
        }
      });

      await createActivityLog({
        invoiceId: input.invoice.id,
        actor: "system",
        event: "payment.receipt_sent",
        message: `Email receipt pembayaran dikirim ke ${input.invoice.client.email}.`,
        metadata: {
          recipientEmail: input.invoice.client.email,
          subject: result.subject
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email receipt gagal dikirim.";

      await prisma.emailLog.create({
        data: {
          invoiceId: input.invoice.id,
          recipientEmail: input.invoice.client.email,
          subject,
          status: "FAILED",
          providerResponse: {
            error: message
          }
        }
      });

      await createActivityLog({
        invoiceId: input.invoice.id,
        actor: "system",
        event: "payment.receipt_failed",
        message,
        metadata: {
          recipientEmail: input.invoice.client.email,
          subject
        }
      });
    }
}

export async function handleDokuCallback(payload: DokuCallbackPayload) {
  const result = await applyDokuPaymentUpdate(payload);

  await maybeSendPaymentReceipt(result);

  return {
    invoiceId: result.invoice.id,
    invoiceNumber: result.invoiceNumber,
    paymentStatus: result.paymentStatus,
    dokuStatus: result.dokuStatus,
    becamePaid: result.becamePaid
  };
}

export async function getDokuPaymentStatus(invoiceNumber: string) {
  const config = getDokuConfig();
  const requestId = crypto.randomUUID();
  const requestTimestamp = createRequestTimestamp();
  const requestTarget = `${STATUS_TARGET_PREFIX}/${encodeURIComponent(invoiceNumber)}`;
  const signature = createSignature({
    clientId: config.clientId,
    requestId,
    requestTimestamp,
    requestTarget,
    secretKey: config.secretKey
  });

  const response = await fetch(`${config.baseUrl}${requestTarget}`, {
    method: "GET",
    headers: {
      "Client-Id": config.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": requestTimestamp,
      Signature: signature
    }
  });
  const responseJson = (await response.json()) as DokuStatusResponse;

  if (!response.ok) {
    throw new Error(getDokuStatusErrorMessage(responseJson));
  }

  return responseJson;
}

export async function syncDokuPaymentStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      invoiceNumber: true
    }
  });

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan.");
  }

  const statusPayload = await getDokuPaymentStatus(invoice.invoiceNumber);
  const payload: DokuCallbackPayload = {
    ...statusPayload,
    order: {
      ...statusPayload.order,
      invoice_number: statusPayload.order?.invoice_number || invoice.invoiceNumber
    }
  };
  const result = await applyDokuPaymentUpdate(payload);

  await maybeSendPaymentReceipt(result);

  return {
    invoiceId: result.invoice.id,
    invoiceNumber: result.invoiceNumber,
    paymentStatus: result.paymentStatus,
    dokuStatus: result.dokuStatus,
    becamePaid: result.becamePaid
  };
}

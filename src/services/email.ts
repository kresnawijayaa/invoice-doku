import "server-only";

import type { Prisma } from "@prisma/client";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { formatCurrency, formatDate } from "@/lib/format";

type InvoiceEmailInput = {
  recipientEmail: string;
  clientName: string;
  companyName: string | null;
  invoiceNumber: string;
  invoiceTitle: string;
  status: string;
  issueDate: Date;
  totalAmount: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  dueDate: Date;
  publicUrl: string;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
  }>;
};

type EmailResult = {
  subject: string;
  response: Prisma.InputJsonValue;
};

type PaymentReceiptEmailInput = {
  recipientEmail: string;
  clientName: string;
  companyName: string | null;
  invoiceNumber: string;
  invoiceTitle: string;
  totalAmount: string;
  paidAt: Date;
  paymentMethod: string | null;
  publicUrl: string;
};

function getEmailFrom() {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM belum dikonfigurasi.");
  }

  return from;
}

function renderTextEmail(input: InvoiceEmailInput) {
  const clientStatus = input.status === "PAID" ? "PAID" : "UNPAID";
  const itemLines = input.items.map(
    (item) => `- ${item.description} (${item.quantity} x ${formatCurrency(item.unitPrice)}): ${formatCurrency(item.totalPrice)}`
  );

  return [
    `Berikut adalah informasi invoice untuk ${input.companyName || input.clientName}.`,
    "",
    `Nomor Invoice: ${input.invoiceNumber}`,
    `Status Pembayaran: ${clientStatus}`,
    `Tanggal Invoice: ${formatDate(input.issueDate)}`,
    `Jatuh Tempo: ${formatDate(input.dueDate)}`,
    "",
    "Rincian Tagihan:",
    ...itemLines,
    "",
    `Subtotal: ${formatCurrency(input.subtotal)}`,
    `Pajak: ${formatCurrency(input.taxAmount)}`,
    `Diskon: ${formatCurrency(input.discountAmount)}`,
    `Total: ${formatCurrency(input.totalAmount)}`,
    "",
    "Silakan gunakan link berikut untuk melihat detail invoice dan melakukan pembayaran:",
    input.publicUrl,
    "",
    "Mohon tidak membalas email otomatis ini."
  ].join("\n");
}

function renderHtmlEmail(input: InvoiceEmailInput) {
  const clientStatus = input.status === "PAID" ? "PAID" : "UNPAID";
  const itemRows = input.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;">${item.description}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:right;">${item.quantity}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#111827;text-align:right;font-weight:700;">${formatCurrency(item.totalPrice)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="margin:0;padding:28px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="padding:28px 32px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td>
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;font-weight:700;">Invoice</div>
                <div style="margin-top:8px;font-size:24px;line-height:1.2;font-weight:800;color:#111827;">${input.invoiceNumber}</div>
                <div style="margin-top:8px;font-size:14px;line-height:1.5;color:#374151;">${input.invoiceTitle}</div>
              </td>
              <td style="text-align:right;vertical-align:top;">
                <div style="display:inline-block;border:1px solid #d1d5db;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700;color:#374151;background:#ffffff;">${clientStatus}</div>
                <div style="margin-top:14px;font-size:13px;color:#6b7280;">Jatuh tempo</div>
                <div style="margin-top:4px;font-size:14px;font-weight:700;">${formatDate(input.dueDate)}</div>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:28px 32px;">
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#374151;">Berikut adalah rincian invoice untuk <strong>${input.companyName || input.clientName}</strong>. Detail invoice dan pembayaran dapat dibuka melalui tombol di bawah.</p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px;">
            <tr>
              <td style="width:50%;padding:16px;border:1px solid #e5e7eb;background:#fcfcfd;vertical-align:top;">
                <div style="font-size:12px;text-transform:uppercase;color:#6b7280;font-weight:700;">Ditagihkan Kepada</div>
                <div style="margin-top:10px;font-weight:700;color:#111827;">${input.clientName}</div>
                <div style="margin-top:4px;color:#6b7280;">${input.companyName || "-"}</div>
                <div style="margin-top:4px;color:#6b7280;">${input.recipientEmail}</div>
              </td>
              <td style="width:50%;padding:16px;border:1px solid #e5e7eb;background:#fcfcfd;vertical-align:top;">
                <div style="font-size:12px;text-transform:uppercase;color:#6b7280;font-weight:700;">Detail Invoice</div>
                <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;">
                  <tr>
                    <td style="padding:4px 0;color:#6b7280;">Tanggal</td>
                    <td style="padding:4px 0;text-align:right;font-weight:700;">${formatDate(input.issueDate)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#6b7280;">Total</td>
                    <td style="padding:4px 0;text-align:right;font-weight:800;">${formatCurrency(input.totalAmount)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
            <thead>
              <tr>
                <th style="padding:12px 0;border-bottom:2px solid #111827;text-align:left;color:#111827;">Rincian Tagihan</th>
                <th style="padding:12px 0;border-bottom:2px solid #111827;text-align:right;color:#111827;">Qty</th>
                <th style="padding:12px 0;border-bottom:2px solid #111827;text-align:right;color:#111827;">Harga</th>
                <th style="padding:12px 0;border-bottom:2px solid #111827;text-align:right;color:#111827;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px;">
            <tr>
              <td style="width:55%;"></td>
              <td style="padding:8px 0;color:#6b7280;">Subtotal</td>
              <td style="padding:8px 0;text-align:right;font-weight:700;">${formatCurrency(input.subtotal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding:8px 0;color:#6b7280;">Pajak</td>
              <td style="padding:8px 0;text-align:right;font-weight:700;">${formatCurrency(input.taxAmount)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding:8px 0;color:#6b7280;">Diskon</td>
              <td style="padding:8px 0;text-align:right;font-weight:700;">${formatCurrency(input.discountAmount)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding:14px 0 0;border-top:1px solid #d1d5db;font-size:16px;font-weight:800;">Total</td>
              <td style="padding:14px 0 0;border-top:1px solid #d1d5db;text-align:right;font-size:18px;font-weight:800;">${formatCurrency(input.totalAmount)}</td>
            </tr>
          </table>

          <a href="${input.publicUrl}" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;padding:14px 16px;font-size:14px;font-weight:700;">Lihat & Bayar Invoice</a>
          <p style="margin:18px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">Jika tombol tidak dapat dibuka, salin link berikut ke browser:<br><span style="word-break:break-all;color:#374151;">${input.publicUrl}</span></p>
          <p style="margin:22px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">Mohon tidak membalas email otomatis ini.</p>
        </div>
      </div>
    </div>
  `;
}

async function sendWithResend(input: InvoiceEmailInput, subject: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY belum dikonfigurasi.");
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: getEmailFrom(),
    to: input.recipientEmail,
    subject,
    text: renderTextEmail(input),
    html: renderHtmlEmail(input)
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    subject,
    response: {
      provider: "resend",
      id: result.data?.id
    }
  };
}

function renderReceiptTextEmail(input: PaymentReceiptEmailInput) {
  return [
    `Pembayaran untuk invoice ${input.invoiceNumber} telah diterima.`,
    "",
    `Client: ${input.companyName || input.clientName}`,
    `Invoice: ${input.invoiceTitle}`,
    `Total Dibayar: ${formatCurrency(input.totalAmount)}`,
    `Tanggal Pembayaran: ${formatDate(input.paidAt)}`,
    `Metode Pembayaran: ${input.paymentMethod || "-"}`,
    `Status Pembayaran: PAID`,
    "",
    "Detail invoice dapat dilihat melalui link berikut:",
    input.publicUrl,
    "",
    "Mohon tidak membalas email otomatis ini."
  ].join("\n");
}

function renderReceiptHtmlEmail(input: PaymentReceiptEmailInput) {
  return `
    <div style="margin:0;padding:28px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="padding:28px 32px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#15803d;font-weight:700;">Pembayaran Diterima</div>
          <div style="margin-top:8px;font-size:24px;line-height:1.2;font-weight:800;color:#111827;">${input.invoiceNumber}</div>
          <div style="margin-top:8px;font-size:14px;line-height:1.5;color:#374151;">${input.invoiceTitle}</div>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#374151;">Pembayaran untuk invoice berikut telah diterima dan status invoice telah diperbarui menjadi <strong>PAID</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Client</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${input.companyName || input.clientName}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Total Dibayar</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:800;">${formatCurrency(input.totalAmount)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Tanggal Pembayaran</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${formatDate(input.paidAt)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Metode Pembayaran</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${input.paymentMethod || "-"}</td>
            </tr>
          </table>
          <a href="${input.publicUrl}" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;padding:14px 16px;font-size:14px;font-weight:700;">Lihat Invoice</a>
          <p style="margin:18px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">Jika tombol tidak dapat dibuka, salin link berikut ke browser:<br><span style="word-break:break-all;color:#374151;">${input.publicUrl}</span></p>
          <p style="margin:22px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">Mohon tidak membalas email otomatis ini.</p>
        </div>
      </div>
    </div>
  `;
}

async function sendReceiptWithResend(input: PaymentReceiptEmailInput, subject: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY belum dikonfigurasi.");
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: getEmailFrom(),
    to: input.recipientEmail,
    subject,
    text: renderReceiptTextEmail(input),
    html: renderReceiptHtmlEmail(input)
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    subject,
    response: {
      provider: "resend",
      id: result.data?.id
    }
  };
}

async function sendReceiptWithSmtp(input: PaymentReceiptEmailInput, subject: string): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, dan SMTP_PASSWORD wajib dikonfigurasi untuk EMAIL_PROVIDER=smtp.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });

  const result = await transporter.sendMail({
    from: getEmailFrom(),
    to: input.recipientEmail,
    subject,
    text: renderReceiptTextEmail(input),
    html: renderReceiptHtmlEmail(input)
  });

  return {
    subject,
    response: {
      provider: "smtp",
      messageId: result.messageId,
      accepted: result.accepted.map(String),
      rejected: result.rejected.map(String)
    }
  };
}

async function sendWithSmtp(input: InvoiceEmailInput, subject: string): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, dan SMTP_PASSWORD wajib dikonfigurasi untuk EMAIL_PROVIDER=smtp.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });

  const result = await transporter.sendMail({
    from: getEmailFrom(),
    to: input.recipientEmail,
    subject,
    text: renderTextEmail(input),
    html: renderHtmlEmail(input)
  });

  return {
    subject,
    response: {
      provider: "smtp",
      messageId: result.messageId,
      accepted: result.accepted.map(String),
      rejected: result.rejected.map(String)
    }
  };
}

export async function sendInvoiceEmail(input: InvoiceEmailInput): Promise<EmailResult> {
  const company = input.companyName || input.clientName;
  const subject = `Invoice ${input.invoiceNumber} - ${company}`;
  const provider = process.env.EMAIL_PROVIDER ?? "resend";

  if (provider === "smtp") {
    return sendWithSmtp(input, subject);
  }

  if (provider === "resend") {
    return sendWithResend(input, subject);
  }

  throw new Error(`EMAIL_PROVIDER tidak dikenal: ${provider}`);
}

export async function sendPaymentReceiptEmail(input: PaymentReceiptEmailInput): Promise<EmailResult> {
  const subject = `Pembayaran Diterima - Invoice ${input.invoiceNumber}`;
  const provider = process.env.EMAIL_PROVIDER ?? "resend";

  if (provider === "smtp") {
    return sendReceiptWithSmtp(input, subject);
  }

  if (provider === "resend") {
    return sendReceiptWithResend(input, subject);
  }

  throw new Error(`EMAIL_PROVIDER tidak dikenal: ${provider}`);
}

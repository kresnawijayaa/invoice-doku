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
  totalAmount: string;
  dueDate: Date;
  publicUrl: string;
};

type EmailResult = {
  subject: string;
  response: Prisma.InputJsonValue;
};

function getEmailFrom() {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM belum dikonfigurasi.");
  }

  return from;
}

function renderTextEmail(input: InvoiceEmailInput) {
  return [
    `Halo ${input.clientName},`,
    "",
    `Berikut kami kirimkan invoice untuk ${input.invoiceTitle}.`,
    "",
    `Nomor Invoice: ${input.invoiceNumber}`,
    `Total Tagihan: ${formatCurrency(input.totalAmount)}`,
    `Jatuh Tempo: ${formatDate(input.dueDate)}`,
    "",
    "Silakan klik link berikut untuk melihat detail invoice dan melakukan pembayaran:",
    input.publicUrl,
    "",
    "Terima kasih."
  ].join("\n");
}

function renderHtmlEmail(input: InvoiceEmailInput) {
  return `
    <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;">
        <p style="margin:0 0 16px;font-size:14px;">Halo ${input.clientName},</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Berikut kami kirimkan invoice untuk <strong>${input.invoiceTitle}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Nomor Invoice</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">${input.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Total Tagihan</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">${formatCurrency(input.totalAmount)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Jatuh Tempo</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">${formatDate(input.dueDate)}</td>
          </tr>
        </table>
        <a href="${input.publicUrl}" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-size:14px;font-weight:600;">View & Pay Invoice</a>
        <p style="margin:20px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">Terima kasih.</p>
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

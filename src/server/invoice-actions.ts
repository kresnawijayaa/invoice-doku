"use server";

import crypto from "crypto";
import { InvoiceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendInvoiceEmail } from "@/services/email";

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client wajib dipilih."),
  title: z.string().trim().min(1, "Judul invoice wajib diisi."),
  issueDate: z.string().min(1, "Issue date wajib diisi."),
  dueDate: z.string().min(1, "Due date wajib diisi."),
  notes: z.string().trim().optional(),
  taxAmount: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0)
});

const statusSchema = z.nativeEnum(InvoiceStatus);

function createClientCode(clientName: string, companyName?: string | null) {
  const source = companyName || clientName;
  const words = source
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 3) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  return source.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).padEnd(3, "X").toUpperCase();
}

async function generateInvoiceNumber(clientId: string, issueDate: Date) {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: { name: true, companyName: true }
  });
  const code = createClientCode(client.name, client.companyName);
  const year = issueDate.getFullYear();
  const month = String(issueDate.getMonth() + 1).padStart(2, "0");
  const prefix = `INV-${code}-${year}-${month}`;
  const count = await prisma.invoice.count({
    where: {
      invoiceNumber: {
        startsWith: prefix
      }
    }
  });

  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

function parseItems(formData: FormData, errorPath: string) {
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
    redirect(`${errorPath}?error=${encodeURIComponent("Minimal satu item invoice wajib diisi.")}`);
  }

  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      redirect(`${errorPath}?error=${encodeURIComponent("Qty dan harga item harus valid.")}`);
    }
  }

  return items.map((item) => ({
    ...item,
    totalPrice: item.quantity * item.unitPrice
  }));
}

export async function createInvoiceAction(formData: FormData) {
  const parsed = invoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    taxAmount: formData.get("taxAmount") || 0,
    discountAmount: formData.get("discountAmount") || 0
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Input invoice tidak valid.";
    redirect(`/invoices/create?error=${encodeURIComponent(message)}`);
  }

  const items = parseItems(formData, "/invoices/create");
  const issueDate = new Date(parsed.data.issueDate);
  const dueDate = new Date(parsed.data.dueDate);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalAmount = subtotal + parsed.data.taxAmount - parsed.data.discountAmount;

  if (totalAmount < 0) {
    redirect(`/invoices/create?error=${encodeURIComponent("Total invoice tidak boleh negatif.")}`);
  }

  const invoiceNumber = await generateInvoiceNumber(parsed.data.clientId, issueDate);
  const publicToken = crypto.randomBytes(24).toString("hex");

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      notes: parsed.data.notes || null,
      issueDate,
      dueDate,
      subtotal,
      taxAmount: parsed.data.taxAmount,
      discountAmount: parsed.data.discountAmount,
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
    select: { id: true }
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}?success=created`);
}

export async function updateInvoiceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/invoices?error=Invoice tidak ditemukan.");
  }

  const errorPath = `/invoices/${id}/edit`;
  const existingInvoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      id: true,
      status: true
    }
  });

  if (!existingInvoice) {
    redirect("/invoices?error=Invoice tidak ditemukan.");
  }

  if (existingInvoice.status === "PAID") {
    redirect(`/invoices/${id}?error=${encodeURIComponent("Invoice yang sudah PAID tidak bisa diedit.")}`);
  }

  const parsed = invoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    taxAmount: formData.get("taxAmount") || 0,
    discountAmount: formData.get("discountAmount") || 0
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Input invoice tidak valid.";
    redirect(`${errorPath}?error=${encodeURIComponent(message)}`);
  }

  const items = parseItems(formData, errorPath);
  const issueDate = new Date(parsed.data.issueDate);
  const dueDate = new Date(parsed.data.dueDate);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalAmount = subtotal + parsed.data.taxAmount - parsed.data.discountAmount;

  if (totalAmount < 0) {
    redirect(`${errorPath}?error=${encodeURIComponent("Total invoice tidak boleh negatif.")}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({
      where: { invoiceId: id }
    });

    await tx.invoice.update({
      where: { id },
      data: {
        clientId: parsed.data.clientId,
        title: parsed.data.title,
        notes: parsed.data.notes || null,
        issueDate,
        dueDate,
        subtotal,
        taxAmount: parsed.data.taxAmount,
        discountAmount: parsed.data.discountAmount,
        totalAmount,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          }))
        }
      }
    });
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath(`/invoices/${id}/edit`);
  redirect(`/invoices/${id}?success=updated`);
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = statusSchema.safeParse(formData.get("status"));

  if (!id || !status.success) {
    redirect("/invoices?error=Invoice tidak valid.");
  }

  await prisma.invoice.update({
    where: { id },
    data: {
      status: status.data,
      paidAt: status.data === "PAID" ? new Date() : null
    }
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?success=status`);
}

export async function deleteInvoiceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/invoices?error=Invoice tidak ditemukan.");
  }

  await prisma.invoice.delete({
    where: { id }
  });

  revalidatePath("/invoices");
  redirect("/invoices?success=deleted");
}

export async function sendInvoiceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/invoices?error=Invoice tidak ditemukan.");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!invoice) {
    redirect("/invoices?error=Invoice tidak ditemukan.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${appUrl}/invoice/${invoice.publicToken}`;
  const subject = `Invoice ${invoice.invoiceNumber} - ${invoice.client.companyName || invoice.client.name}`;

  try {
    const result = await sendInvoiceEmail({
      recipientEmail: invoice.client.email,
      clientName: invoice.client.name,
      companyName: invoice.client.companyName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceTitle: invoice.title,
      status: invoice.status,
      issueDate: invoice.issueDate,
      totalAmount: invoice.totalAmount.toString(),
      subtotal: invoice.subtotal.toString(),
      taxAmount: invoice.taxAmount.toString(),
      discountAmount: invoice.discountAmount.toString(),
      dueDate: invoice.dueDate,
      publicUrl,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString()
      }))
    });

    await prisma.$transaction([
      prisma.emailLog.create({
        data: {
          invoiceId: invoice.id,
          recipientEmail: invoice.client.email,
          subject: result.subject,
          status: "SENT",
          providerResponse: result.response,
          sentAt: new Date()
        }
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: invoice.status === "PAID" ? "PAID" : "SENT",
          sentAt: new Date()
        }
      })
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email gagal dikirim.";

    await prisma.emailLog.create({
      data: {
        invoiceId: invoice.id,
        recipientEmail: invoice.client.email,
        subject,
        status: "FAILED",
        providerResponse: {
          error: message
        }
      }
    });

    revalidatePath(`/invoices/${invoice.id}`);
    redirect(`/invoices/${invoice.id}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  redirect(`/invoices/${invoice.id}?success=email`);
}

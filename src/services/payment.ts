import "server-only";

import { prisma } from "@/lib/prisma";
import { createDokuPayment } from "@/services/doku";
import { createMidtransPayment } from "@/services/midtrans";

export async function createInvoicePayment(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { paymentProvider: true }
  });

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan.");
  }

  if (invoice.paymentProvider === "MIDTRANS") {
    return createMidtransPayment(invoiceId);
  }

  return createDokuPayment(invoiceId);
}

import "server-only";

import { prisma } from "@/lib/prisma";

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

export async function generateInvoiceNumber(clientId: string, issueDate: Date) {
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

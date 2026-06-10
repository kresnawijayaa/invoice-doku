import { NextResponse } from "next/server";
import { createActivityLog } from "@/services/activity-log";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/services/invoice-pdf";

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ token: string }>;
  }
) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      client: true,
      items: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!invoice) {
    return NextResponse.json({ message: "Invoice tidak ditemukan." }, { status: 404 });
  }

  const pdf = generateInvoicePdf(invoice);

  createActivityLog({
    invoiceId: invoice.id,
    actor: "public",
    event: "invoice.pdf_downloaded",
    message: "PDF invoice diunduh dari public link.",
    metadata: {
      invoiceNumber: invoice.invoiceNumber
    }
  }).catch((error) => {
    console.error("Failed to write PDF activity log", error);
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
}

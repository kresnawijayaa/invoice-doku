import { NextResponse } from "next/server";
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

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
}

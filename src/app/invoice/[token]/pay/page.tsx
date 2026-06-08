import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createDokuPayment } from "@/services/doku";

export default async function PayInvoicePage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      invoiceNumber: true,
      title: true,
      status: true,
      totalAmount: true,
      client: {
        select: {
          name: true,
          companyName: true
        }
      }
    }
  });

  if (!invoice) {
    notFound();
  }

  if (invoice.status === "PAID") {
    redirect(`/invoice/${token}/success`);
  }

  let paymentUrl: string | null = null;
  let errorMessage: string | null = null;

  try {
    paymentUrl = await createDokuPayment(invoice.id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Gagal membuat pembayaran DOKU.";
  }

  if (paymentUrl) {
    redirect(paymentUrl);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <section className="w-full max-w-lg rounded-lg border border-line bg-panel p-6 shadow-sm">
        <p className="text-sm font-medium text-muted">{invoice.invoiceNumber}</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Pembayaran DOKU</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Sistem belum bisa mengarahkan ke DOKU karena request pembayaran gagal dibuat.
        </p>

        <div className="mt-6 rounded-md bg-gray-50 p-4">
          <p className="text-sm font-medium text-ink">{invoice.client.companyName || invoice.client.name}</p>
          <p className="mt-1 text-sm text-muted">{invoice.title}</p>
          <p className="mt-4 text-2xl font-semibold text-ink">{formatCurrency(invoice.totalAmount.toString())}</p>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        <Link
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink"
          href={`/invoice/${token}`}
        >
          Kembali ke Invoice
        </Link>
      </section>
    </main>
  );
}

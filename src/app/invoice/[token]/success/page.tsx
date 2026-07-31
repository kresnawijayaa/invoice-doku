import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function InvoiceSuccessPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    select: {
      invoiceNumber: true,
      title: true,
      status: true,
      totalAmount: true,
      paidAt: true,
      paymentProvider: true
    }
  });

  if (!invoice) {
    notFound();
  }

  const isPaid = invoice.status === "PAID";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-3 py-6 sm:px-4 sm:py-8">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
        <div className="text-center">
          <p className={isPaid ? "text-sm font-medium text-green-700" : "text-sm font-medium text-amber-700"}>
            {isPaid ? "Pembayaran diterima" : "Pembayaran sedang diproses"}
          </p>
          <h1 className="mt-2 break-words text-2xl font-semibold text-ink">{invoice.invoiceNumber}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{invoice.title}</p>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <dt className="text-muted">Status</dt>
            <dd>
              <StatusBadge status={invoice.status} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <dt className="text-muted">Total</dt>
            <dd className="font-semibold text-ink">{formatCurrency(invoice.totalAmount.toString())}</dd>
          </div>
          {invoice.paidAt ? (
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <dt className="text-muted">Dibayar</dt>
              <dd className="font-medium text-ink">{formatDate(invoice.paidAt)}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-5 text-center text-sm leading-6 text-muted">
          {isPaid
            ? "Status invoice sudah diperbarui menjadi PAID."
            : `Kami sudah menerima redirect dari ${invoice.paymentProvider === "MIDTRANS" ? "Midtrans" : "DOKU"}. Jika status belum PAID, sistem akan memperbarui setelah callback payment gateway diterima.`}
        </p>
        <Link className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white" href={`/invoice/${token}`}>
          Lihat Invoice
        </Link>
      </section>
    </main>
  );
}

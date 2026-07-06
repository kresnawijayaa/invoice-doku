import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PublicInvoicePageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PublicInvoicePageProps): Promise<Metadata> {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    select: {
      invoiceNumber: true,
      client: {
        select: {
          companyName: true,
          name: true
        }
      }
    }
  });

  if (!invoice) {
    return {
      title: "Invoice tidak ditemukan"
    };
  }

  return {
    title: `${invoice.invoiceNumber} - ${invoice.client.companyName || invoice.client.name}`
  };
}

export default async function PublicInvoicePage({ params }: PublicInvoicePageProps) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      client: {
        select: {
          name: true,
          companyName: true,
          email: true,
          phone: true,
          address: true,
          billingToken: true
        }
      },
      items: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!invoice) {
    notFound();
  }

  const canPay = ["SENT", "UNPAID", "OVERDUE"].includes(invoice.status);
  const clientStatus = invoice.status === "PAID" ? "PAID" : "UNPAID";

  return (
    <main className="min-h-screen bg-gray-100 px-3 py-4 sm:px-6 lg:py-10">
      <section className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-col gap-4 border-b border-gray-200 pb-5 sm:mb-6 sm:pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">Invoice</p>
            <h1 className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">{invoice.invoiceNumber}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{invoice.title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={clientStatus} />
            <span className="text-sm text-muted">Due {formatDate(invoice.dueDate)}</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-lg border border-line bg-panel shadow-sm">
            <div className="grid gap-6 border-b border-line p-4 sm:p-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Ditagihkan Kepada</p>
                <p className="mt-3 text-base font-semibold text-ink">{invoice.client.name}</p>
                <p className="break-words text-sm text-muted">{invoice.client.companyName || "-"}</p>
                <p className="mt-2 break-all text-sm text-muted">{invoice.client.email}</p>
                {invoice.client.phone ? <p className="text-sm text-muted">{invoice.client.phone}</p> : null}
                {invoice.client.address ? <p className="mt-2 whitespace-pre-line text-sm text-muted">{invoice.client.address}</p> : null}
              </div>
              <div className="md:text-right">
                <p className="text-xs font-semibold uppercase text-muted">Tanggal Invoice</p>
                <p className="mt-3 text-sm text-ink">Issue date: {formatDate(invoice.issueDate)}</p>
                <p className="text-sm text-ink">Due date: {formatDate(invoice.dueDate)}</p>
                {invoice.paidAt ? <p className="mt-2 text-sm text-green-700">Dibayar: {formatDate(invoice.paidAt)}</p> : null}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="space-y-3 md:hidden">
                {invoice.items.map((item) => (
                  <article key={item.id} className="rounded-md border border-line p-4">
                    <p className="font-medium leading-6 text-ink">{item.description}</p>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs uppercase text-muted">Qty</p>
                        <p className="mt-1 text-ink">{item.quantity.toString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase text-muted">Harga</p>
                        <p className="mt-1 text-ink">{formatCurrency(item.unitPrice.toString())}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase text-muted">Total</p>
                        <p className="mt-1 font-semibold text-ink">{formatCurrency(item.totalPrice.toString())}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase text-muted">
                  <tr>
                    <th className="pb-3 font-semibold">Rincian</th>
                    <th className="pb-3 text-right font-semibold">Qty</th>
                    <th className="pb-3 text-right font-semibold">Harga</th>
                    <th className="pb-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 pr-4 font-medium text-ink">{item.description}</td>
                      <td className="py-4 text-right text-muted">{item.quantity.toString()}</td>
                      <td className="py-4 text-right text-muted">{formatCurrency(item.unitPrice.toString())}</td>
                      <td className="py-4 text-right font-semibold text-ink">{formatCurrency(item.totalPrice.toString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {invoice.notes ? (
                <div className="mt-6 rounded-md bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase text-muted">Catatan</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{invoice.notes}</p>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <p className="text-sm font-medium text-muted">Total Tagihan</p>
              <p className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">{formatCurrency(invoice.totalAmount.toString())}</p>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-medium text-ink">{formatCurrency(invoice.subtotal.toString())}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Pajak</dt>
                  <dd className="font-medium text-ink">{formatCurrency(invoice.taxAmount.toString())}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Diskon</dt>
                  <dd className="font-medium text-ink">{formatCurrency(invoice.discountAmount.toString())}</dd>
                </div>
              </dl>

              {canPay ? (
                <Link
                  className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white"
                  href={`/invoice/${token}/pay`}
                >
                  Bayar Sekarang
                </Link>
              ) : (
                <div className="mt-6 rounded-md bg-gray-50 p-4 text-sm text-muted">
                  {invoice.status === "PAID" ? "Invoice ini sudah dibayar." : "Pembayaran untuk invoice ini tidak tersedia."}
                </div>
              )}
              <Link
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink"
                href={`/invoice/${token}/pdf`}
              >
                Download PDF
              </Link>
              {invoice.client.billingToken ? (
                <Link
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink"
                  href={`/billing/${invoice.client.billingToken}`}
                >
                  Billing Portal
                </Link>
              ) : null}
            </section>

            <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-ink">Informasi Pembayaran</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Pembayaran diproses melalui DOKU. Setelah pembayaran berhasil, status invoice akan diperbarui otomatis.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

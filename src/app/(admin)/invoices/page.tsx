import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function InvoicesPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: {
        select: {
          name: true,
          companyName: true
        }
      }
    }
  });

  return (
    <main className="p-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Billing</p>
            <h1 className="text-2xl font-semibold text-ink">Invoices</h1>
          </div>
          <Link className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-white" href="/invoices/create">
            Buat Invoice
          </Link>
        </div>

        {params?.success === "deleted" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Invoice berhasil dihapus.
          </div>
        ) : null}
        {params?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Nomor</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Judul</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-ink">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-4 text-muted">{invoice.client.companyName || invoice.client.name}</td>
                    <td className="px-4 py-4 text-muted">{invoice.title}</td>
                    <td className="px-4 py-4 text-muted">{formatDate(invoice.dueDate)}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-ink">{formatCurrency(invoice.totalAmount.toString())}</td>
                    <td className="px-4 py-4 text-right">
                      <Link className="font-medium text-ink underline-offset-4 hover:underline" href={`/invoices/${invoice.id}`}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan={7}>
                    Belum ada invoice. Buat invoice pertama dari data client yang sudah ada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

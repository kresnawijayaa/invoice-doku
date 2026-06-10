import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [totalInvoices, unpaidInvoices, paidInvoices, overdueInvoices, paidThisMonth, invoicesThisMonth, recentInvoices] =
    await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: { in: ["SENT", "UNPAID"] } } }),
      prisma.invoice.count({ where: { status: "PAID" } }),
      prisma.invoice.count({
        where: {
          OR: [{ status: "OVERDUE" }, { status: { in: ["SENT", "UNPAID"] }, dueDate: { lt: now } }]
        }
      }),
      prisma.invoice.aggregate({
        where: {
          status: "PAID",
          paidAt: {
            gte: startOfMonth,
            lt: nextMonth
          }
        },
        _sum: {
          totalAmount: true
        }
      }),
      prisma.invoice.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: nextMonth
          }
        }
      }),
      prisma.invoice.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          client: {
            select: {
              name: true,
              companyName: true
            }
          }
        }
      })
    ]);

  const cards = [
    ["Revenue Bulan Ini", formatCurrency(paidThisMonth._sum.totalAmount?.toString() ?? "0")],
    ["Invoice Bulan Ini", invoicesThisMonth.toString()],
    ["Belum Dibayar", unpaidInvoices.toString()],
    ["Overdue", overdueInvoices.toString()],
    ["Total Invoice", totalInvoices.toString()],
    ["Sudah Dibayar", paidInvoices.toString()]
  ];

  return (
    <main className="px-4 py-5 sm:p-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-muted">Admin</p>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([label, value]) => (
            <article key={label} className="rounded-lg border border-line bg-panel p-5 shadow-sm">
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">Invoice Terbaru</h2>
            <Link className="text-sm font-medium text-ink underline-offset-4 hover:underline" href="/invoices">
              Lihat semua
            </Link>
          </div>
          <div className="divide-y divide-line md:hidden">
            {recentInvoices.length > 0 ? (
              recentInvoices.map((invoice) => (
                <Link key={invoice.id} className="block p-4 hover:bg-gray-50" href={`/invoices/${invoice.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-ink">{invoice.invoiceNumber}</p>
                      <p className="mt-1 text-sm text-muted">{invoice.client.companyName || invoice.client.name}</p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">Due {formatDate(invoice.dueDate)}</span>
                    <span className="font-medium text-ink">{formatCurrency(invoice.totalAmount.toString())}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted">Belum ada invoice.</p>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Nomor</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Link className="font-medium text-ink underline-offset-4 hover:underline" href={`/invoices/${invoice.id}`}>
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-muted">{invoice.client.companyName || invoice.client.name}</td>
                    <td className="px-4 py-4 text-muted">{formatDate(invoice.dueDate)}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-ink">{formatCurrency(invoice.totalAmount.toString())}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan={5}>
                    Belum ada invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </main>
  );
}

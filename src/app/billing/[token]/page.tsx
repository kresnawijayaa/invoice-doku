import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getClientBillingByToken } from "@/services/billing";

type BillingPortalPageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: BillingPortalPageProps): Promise<Metadata> {
  const { token } = await params;
  const billing = await getClientBillingByToken(token);

  if (!billing) {
    return {
      title: "Billing tidak ditemukan"
    };
  }

  return {
    title: `Billing - ${billing.client.companyName || billing.client.name}`
  };
}

type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  title: string;
  issueDate: Date;
  dueDate: Date;
  totalAmount: { toString(): string };
  status: string;
  publicToken: string;
  paidAt: Date | null;
};

function BillingTable({
  invoices
}: {
  invoices: BillingInvoice[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
      <div className="divide-y divide-line md:hidden">
        {invoices.map((invoice) => (
          <article key={invoice.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="break-words font-semibold text-emerald-700 underline-offset-4 hover:underline" href={`/invoice/${invoice.publicToken}`}>
                  {invoice.invoiceNumber}
                </Link>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{invoice.title}</p>
              </div>
              <StatusBadge status={invoice.status === "SENT" ? "UNPAID" : invoice.status} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <dt className="text-xs font-medium uppercase text-muted">Total</dt>
                <dd className="mt-1 font-semibold text-ink">{formatCurrency(invoice.totalAmount.toString())}</dd>
              </div>
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <dt className="text-xs font-medium uppercase text-muted">Due Date</dt>
                <dd className="mt-1 font-semibold text-ink">{formatDate(invoice.dueDate)}</dd>
              </div>
            </dl>

            <Link
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink"
              href={`/invoice/${invoice.publicToken}`}
            >
              {invoice.status === "PAID" ? "Lihat Detail" : "Bayar Sekarang"}
            </Link>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-5 py-4 font-semibold">Invoice</th>
              <th className="px-5 py-4 font-semibold">Judul</th>
              <th className="px-5 py-4 text-right font-semibold">Total</th>
              <th className="px-5 py-4 font-semibold">Invoice Date</th>
              <th className="px-5 py-4 font-semibold">Due Date</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-semibold text-ink">
                  <Link className="text-emerald-700 underline-offset-4 hover:underline" href={`/invoice/${invoice.publicToken}`}>
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="max-w-xs px-5 py-4 text-muted">{invoice.title}</td>
                <td className="px-5 py-4 text-right font-medium text-ink">{formatCurrency(invoice.totalAmount.toString())}</td>
                <td className="px-5 py-4 text-muted">{formatDate(invoice.issueDate)}</td>
                <td className="px-5 py-4 text-muted">{formatDate(invoice.dueDate)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={invoice.status === "SENT" ? "UNPAID" : invoice.status} />
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-medium text-ink hover:bg-gray-50"
                    href={`/invoice/${invoice.publicToken}`}
                  >
                    {invoice.status === "PAID" ? "Detail" : "Pay"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyTable({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-5 py-10 text-center text-sm text-muted shadow-sm">
      {message}
    </div>
  );
}

function MetricCard({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </article>
  );
}

export default async function BillingPortalPage({ params }: BillingPortalPageProps) {
  const { token } = await params;
  const billing = await getClientBillingByToken(token);

  if (!billing) {
    notFound();
  }

  const clientName = billing.client.companyName || billing.client.name;
  const latestPaidInvoices = billing.paidInvoices.slice(0, 10);
  const allInvoices = [...billing.openInvoices, ...latestPaidInvoices];
  const outstandingTotal = billing.openInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount.toString()), 0);

  return (
    <main className="min-h-screen bg-gray-100">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-6 border-b border-line pb-5">
          <p className="text-sm font-medium text-muted">Billing & Payment</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">{clientName}</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Lihat tagihan aktif, tagihan jatuh tempo, dan riwayat pembayaran untuk layanan Anda.
              </p>
            </div>
            <div
              className={
                billing.action === "BLOCK"
                  ? "rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                  : billing.action === "WARN"
                    ? "rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
                    : "rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700"
              }
            >
              {billing.action === "BLOCK" ? "ACCESS BLOCKED" : billing.action === "WARN" ? "PAYMENT WARNING" : "ACCESS ACTIVE"}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Outstanding" value={formatCurrency(String(outstandingTotal))} />
          <MetricCard label="Overdue Invoice" value={String(billing.overdueInvoices.length)} />
          <MetricCard label="Paid History" value={String(billing.paidInvoices.length)} />
        </div>

        {!billing.client.billingEnabled ? (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Billing access check untuk client ini sedang nonaktif.
          </div>
        ) : null}

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <div
            className={
              billing.action === "BLOCK"
                ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                : billing.action === "WARN"
                  ? "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
                  : "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
            }
          >
            {billing.action === "BLOCK"
              ? "Ada tagihan lewat jatuh tempo. Selesaikan pembayaran untuk membuka akses layanan."
              : billing.action === "WARN" && billing.nearestDueInvoice
                ? `Tagihan ${billing.nearestDueInvoice.invoiceNumber} jatuh tempo dalam ${billing.nearestDueInvoice.daysUntilDue} hari.`
                : "Tidak ada tagihan lewat jatuh tempo."}
          </div>
        </div>

        <section className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Billing</h2>
              <p className="mt-1 text-sm text-muted">Daftar invoice dan status pembayaran.</p>
            </div>
            <div className="hidden flex-col gap-3 sm:flex-row sm:items-center md:flex">
              <div className="relative">
                <input
                  className="h-11 w-full rounded-md border border-line bg-white px-3 pr-10 text-sm text-muted outline-none sm:w-80"
                  placeholder="Search"
                  readOnly
                />
                <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-muted" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>Show:</span>
                <span className="inline-flex h-11 items-center rounded-md border border-line bg-white px-4 font-medium text-ink">
                  20
                </span>
              </div>
            </div>
          </div>

          {allInvoices.length > 0 ? (
            <BillingTable invoices={allInvoices} />
          ) : (
            <EmptyTable message="Belum ada invoice untuk client ini." />
          )}
        </section>
      </section>
    </main>
  );
}

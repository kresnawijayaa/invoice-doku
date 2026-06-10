import Link from "next/link";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { formatCurrency, formatDate } from "@/lib/format";
import { createPageHref, getPage, getTotalPages, PAGE_SIZE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const invoiceStatuses: InvoiceStatus[] = ["DRAFT", "SENT", "UNPAID", "PAID", "OVERDUE", "CANCELLED"];
const sortOptions = {
  latest: { label: "Terbaru", orderBy: { createdAt: "desc" } },
  due_asc: { label: "Due terdekat", orderBy: { dueDate: "asc" } },
  due_desc: { label: "Due terjauh", orderBy: { dueDate: "desc" } },
  total_desc: { label: "Total terbesar", orderBy: { totalAmount: "desc" } },
  total_asc: { label: "Total terkecil", orderBy: { totalAmount: "asc" } }
} satisfies Record<string, { label: string; orderBy: Prisma.InvoiceOrderByWithRelationInput }>;
type SortKey = keyof typeof sortOptions;

export default async function InvoicesPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string; q?: string; status?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const selectedStatus = invoiceStatuses.includes(params?.status as InvoiceStatus) ? (params?.status as InvoiceStatus) : "";
  const selectedSort: SortKey = params?.sort && params.sort in sortOptions ? (params.sort as SortKey) : "latest";
  const page = getPage(params?.page);
  const where: Prisma.InvoiceWhereInput = {
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(query
      ? {
          OR: [
            { invoiceNumber: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
            { client: { name: { contains: query, mode: "insensitive" } } },
            { client: { companyName: { contains: query, mode: "insensitive" } } },
            { client: { email: { contains: query, mode: "insensitive" } } }
          ]
        }
      : {})
  };
  const [invoices, totalInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: sortOptions[selectedSort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        client: {
          select: {
            name: true,
            companyName: true
          }
        }
      }
    }),
    prisma.invoice.count({ where })
  ]);
  const totalPages = getTotalPages(totalInvoices);
  const currentPage = Math.min(page, totalPages);
  const paginationParams = {
    q: query || undefined,
    status: selectedStatus || undefined,
    sort: selectedSort === "latest" ? undefined : selectedSort
  };

  return (
    <main className="px-4 py-5 sm:p-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Billing</p>
            <h1 className="text-2xl font-semibold text-ink">Invoices</h1>
          </div>
          <Link className="inline-flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white sm:w-auto" href="/invoices/create">
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

        <form className="mb-4 grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm md:grid-cols-[1fr_180px_180px_auto]">
          <label className="block">
            <span className="text-xs font-medium uppercase text-muted">Cari</span>
            <input
              className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              name="q"
              placeholder="Nomor, judul, client, email"
              defaultValue={query}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-muted">Status</span>
            <select
              className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              name="status"
              defaultValue={selectedStatus}
            >
              <option value="">Semua</option>
              {invoiceStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-muted">Urutkan</span>
            <select
              className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              name="sort"
              defaultValue={selectedSort}
            >
              {Object.entries(sortOptions).map(([value, option]) => (
                <option key={value} value={value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 md:flex md:items-end">
            <button className="h-10 rounded-md bg-ink px-4 text-sm font-medium text-white" type="submit">
              Filter
            </button>
            <Link className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink" href="/invoices">
              Reset
            </Link>
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
          <div className="divide-y divide-line md:hidden">
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <Link key={invoice.id} className="block p-4 hover:bg-gray-50" href={`/invoices/${invoice.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-ink">{invoice.invoiceNumber}</p>
                      <p className="mt-1 break-words text-sm text-muted">{invoice.client.companyName || invoice.client.name}</p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted">{invoice.title}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">Due {formatDate(invoice.dueDate)}</span>
                    <span className="font-medium text-ink">{formatCurrency(invoice.totalAmount.toString())}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted">Tidak ada invoice yang cocok.</p>
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
                    Tidak ada invoice yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            previousHref={createPageHref("/invoices", paginationParams, Math.max(1, currentPage - 1))}
            nextHref={createPageHref("/invoices", paginationParams, Math.min(totalPages, currentPage + 1))}
          />
        </div>
      </section>
    </main>
  );
}

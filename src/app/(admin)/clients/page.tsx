import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Pagination } from "@/components/pagination";
import { createPageHref, getPage, getTotalPages, PAGE_SIZE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const page = getPage(params?.page);
  const where: Prisma.ClientWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { companyName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } }
        ]
      }
    : {};
  const [clients, totalClients] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: {
          select: { invoices: true }
        }
      }
    }),
    prisma.client.count({ where })
  ]);
  const totalPages = getTotalPages(totalClients);
  const currentPage = Math.min(page, totalPages);
  const paginationParams = {
    q: query || undefined
  };

  return (
    <main className="p-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Master Data</p>
            <h1 className="text-2xl font-semibold text-ink">Clients</h1>
          </div>
          <Link className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-white" href="/clients/create">
            Tambah Client
          </Link>
        </div>

        {params?.success === "deleted" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Client berhasil dihapus.
          </div>
        ) : null}
        {params?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</div>
        ) : null}

        <form className="mb-4 flex flex-col gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm sm:flex-row">
          <label className="block flex-1">
            <span className="text-xs font-medium uppercase text-muted">Cari Client</span>
            <input
              className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              name="q"
              placeholder="Nama, perusahaan, email, telepon"
              defaultValue={query}
            />
          </label>
          <div className="flex items-end gap-2">
            <button className="h-10 rounded-md bg-ink px-4 text-sm font-medium text-white" type="submit">
              Cari
            </button>
            <Link className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink" href="/clients">
              Reset
            </Link>
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Perusahaan</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-ink">{client.name}</td>
                    <td className="px-4 py-4 text-muted">{client.companyName || "-"}</td>
                    <td className="px-4 py-4 text-muted">{client.email}</td>
                    <td className="px-4 py-4 text-muted">{client._count.invoices}</td>
                    <td className="px-4 py-4 text-right">
                      <Link className="font-medium text-ink underline-offset-4 hover:underline" href={`/clients/${client.id}`}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan={5}>
                    Tidak ada client yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            previousHref={createPageHref("/clients", paginationParams, Math.max(1, currentPage - 1))}
            nextHref={createPageHref("/clients", paginationParams, Math.min(totalPages, currentPage + 1))}
          />
        </div>
      </section>
    </main>
  );
}

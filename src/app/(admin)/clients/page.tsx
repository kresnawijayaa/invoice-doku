import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { invoices: true }
      }
    }
  });

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
                    Belum ada client. Tambahkan client pertama untuk mulai membuat invoice.
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

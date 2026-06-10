import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import { prisma } from "@/lib/prisma";
import { deleteClientAction, updateClientAction } from "@/server/client-actions";

export default async function ClientDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          title: true,
          status: true,
          totalAmount: true
        }
      }
    }
  });

  if (!client) {
    notFound();
  }

  return (
    <main className="px-4 py-5 sm:p-6">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline" href="/clients">
              Kembali ke clients
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-ink">{client.name}</h1>
            <p className="mt-2 text-sm text-muted">{client.companyName || "Tanpa nama perusahaan"}</p>
          </div>
          <form action={deleteClientAction}>
            <input name="id" type="hidden" value={client.id} />
            <button className="h-10 w-full rounded-md border border-red-200 bg-white px-4 text-sm font-medium text-red-700 sm:w-auto" type="submit">
              Hapus Client
            </button>
          </form>
        </div>

        {query?.success === "created" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Client berhasil dibuat.
          </div>
        ) : null}
        {query?.success === "updated" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Client berhasil diperbarui.
          </div>
        ) : null}
        {query?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{query.error}</div>
        ) : null}

        <ClientForm action={updateClientAction} client={client} submitLabel="Simpan Perubahan" />

        <div className="mt-6 rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-ink">Invoice Client</h2>
            <Link className="inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-medium text-ink sm:w-auto" href="/invoices/create">
              Buat Invoice
            </Link>
          </div>
          {client.invoices.length > 0 ? (
            <div className="divide-y divide-line">
              {client.invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  className="flex flex-col gap-3 py-3 text-sm hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  href={`/invoices/${invoice.id}`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{invoice.invoiceNumber}</span>
                    <span className="block break-words text-muted">{invoice.title}</span>
                  </span>
                  <span className="w-fit rounded-full border border-line px-2 py-1 text-xs font-medium text-muted">{invoice.status}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Belum ada invoice untuk client ini.</p>
          )}
        </div>
      </section>
    </main>
  );
}

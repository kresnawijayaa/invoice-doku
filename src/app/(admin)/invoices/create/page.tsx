import Link from "next/link";
import { InvoiceForm } from "@/components/invoice-form";
import { prisma } from "@/lib/prisma";
import { createInvoiceAction } from "@/server/invoice-actions";

export default async function CreateInvoicePage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const [params, clients] = await Promise.all([
    searchParams,
    prisma.client.findMany({
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        companyName: true
      }
    })
  ]);

  return (
    <main className="p-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline" href="/invoices">
            Kembali ke invoices
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Buat Invoice</h1>
          <p className="mt-2 text-sm text-muted">Nomor invoice dan public token akan dibuat otomatis saat invoice disimpan.</p>
        </div>

        {params?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</div>
        ) : null}

        {clients.length > 0 ? (
          <InvoiceForm action={createInvoiceAction} clients={clients} />
        ) : (
          <div className="rounded-lg border border-line bg-panel p-6 shadow-sm">
            <p className="text-sm text-muted">Tambahkan client terlebih dahulu sebelum membuat invoice.</p>
            <Link className="mt-4 inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-white" href="/clients/create">
              Tambah Client
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

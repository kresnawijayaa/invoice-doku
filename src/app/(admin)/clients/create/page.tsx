import Link from "next/link";
import { ClientForm } from "@/components/client-form";
import { createClientAction } from "@/server/client-actions";

export default async function CreateClientPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="p-6">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline" href="/clients">
            Kembali ke clients
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Tambah Client</h1>
          <p className="mt-2 text-sm text-muted">Data ini akan dipakai sebagai tujuan invoice dan email penagihan.</p>
        </div>

        {params?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</div>
        ) : null}

        <ClientForm action={createClientAction} submitLabel="Simpan Client" />
      </section>
    </main>
  );
}

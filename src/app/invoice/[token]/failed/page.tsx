import Link from "next/link";

export default async function InvoiceFailedPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-red-700">Pembayaran gagal</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Transaksi belum selesai</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Silakan kembali ke invoice untuk mencoba pembayaran lagi.</p>
        <Link className="mt-6 inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-white" href={`/invoice/${token}`}>
          Kembali ke Invoice
        </Link>
      </section>
    </main>
  );
}

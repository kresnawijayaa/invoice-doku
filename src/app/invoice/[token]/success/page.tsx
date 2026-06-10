import Link from "next/link";

export default async function InvoiceSuccessPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-3 py-6 sm:px-4 sm:py-8">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-4 text-center shadow-sm sm:p-6">
        <p className="text-sm font-medium text-green-700">Pembayaran berhasil</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Terima kasih</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Status invoice akan diperbarui otomatis setelah callback DOKU diterima.</p>
        <Link className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white sm:w-auto" href={`/invoice/${token}`}>
          Lihat Invoice
        </Link>
      </section>
    </main>
  );
}

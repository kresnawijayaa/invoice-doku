import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">Invoice Management</p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">DOKU invoice system</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Fondasi aplikasi sudah disiapkan untuk admin dashboard, invoice publik, email, dan payment callback.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-white"
        >
          Masuk Dashboard
        </Link>
      </section>
    </main>
  );
}

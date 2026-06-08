export default function DashboardPage() {
  return (
    <main className="p-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-muted">Admin</p>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Total Invoice", "0"],
            ["Belum Dibayar", "0"],
            ["Sudah Dibayar", "0"]
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-line bg-panel p-5 shadow-sm">
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

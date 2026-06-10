function ConfigStatus({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={
          configured
            ? "rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
            : "rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
        }
      >
        {configured ? "Configured" : "Missing"}
      </span>
    </div>
  );
}

export default function PaymentSettingsPage() {
  const dokuEnv = process.env.DOKU_ENV ?? "sandbox";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackUrl = process.env.DOKU_CALLBACK_URL || `${appUrl}/api/webhooks/doku`;

  return (
    <main className="px-4 py-5 sm:p-6">
      <section className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-medium text-muted">Settings</p>
          <h1 className="text-2xl font-semibold text-ink">Payment</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Status konfigurasi DOKU. Secret tidak ditampilkan di dashboard.</p>
        </div>

        <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-ink">DOKU</h2>
          <div className="mt-4">
            <ConfigStatus label="DOKU_CLIENT_ID" configured={Boolean(process.env.DOKU_CLIENT_ID)} />
            <ConfigStatus label="DOKU_SECRET_KEY" configured={Boolean(process.env.DOKU_SECRET_KEY)} />
            <ConfigStatus label="DOKU_CALLBACK_URL" configured={Boolean(process.env.DOKU_CALLBACK_URL)} />
            <ConfigStatus label="DOKU_SUCCESS_REDIRECT_URL" configured={Boolean(process.env.DOKU_SUCCESS_REDIRECT_URL)} />
            <ConfigStatus label="DOKU_FAILED_REDIRECT_URL" configured={Boolean(process.env.DOKU_FAILED_REDIRECT_URL)} />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-ink">Runtime</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="text-muted">Environment</dt>
              <dd className="font-medium text-ink">{dokuEnv}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="text-muted">Callback URL</dt>
              <dd className="break-all font-medium text-ink">{callbackUrl}</dd>
            </div>
          </dl>
        </section>
      </section>
    </main>
  );
}

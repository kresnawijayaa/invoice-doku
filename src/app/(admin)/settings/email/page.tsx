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

export default function EmailSettingsPage() {
  const provider = process.env.EMAIL_PROVIDER ?? "resend";
  const usesSmtp = provider === "smtp";

  return (
    <main className="px-4 py-5 sm:p-6">
      <section className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-medium text-muted">Settings</p>
          <h1 className="text-2xl font-semibold text-ink">Email</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Status konfigurasi email. API key dan password tidak ditampilkan.</p>
        </div>

        <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-ink">Provider</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="text-muted">EMAIL_PROVIDER</dt>
              <dd className="font-medium text-ink">{provider}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="text-muted">Receipt email</dt>
              <dd className="font-medium text-ink">{process.env.EMAIL_SEND_PAYMENT_RECEIPT === "true" ? "enabled" : "disabled"}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="text-muted">CC</dt>
              <dd className="font-medium text-ink">{process.env.EMAIL_CC ? "enabled" : "disabled"}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="text-muted">BCC</dt>
              <dd className="font-medium text-ink">{process.env.EMAIL_BCC ? "enabled" : "disabled"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-ink">{usesSmtp ? "SMTP" : "Resend"}</h2>
          <div className="mt-4">
            <ConfigStatus label="EMAIL_FROM" configured={Boolean(process.env.EMAIL_FROM)} />
            {usesSmtp ? (
              <>
                <ConfigStatus label="SMTP_HOST" configured={Boolean(process.env.SMTP_HOST)} />
                <ConfigStatus label="SMTP_PORT" configured={Boolean(process.env.SMTP_PORT)} />
                <ConfigStatus label="SMTP_USER" configured={Boolean(process.env.SMTP_USER)} />
                <ConfigStatus label="SMTP_PASSWORD" configured={Boolean(process.env.SMTP_PASSWORD)} />
              </>
            ) : (
              <ConfigStatus label="RESEND_API_KEY" configured={Boolean(process.env.RESEND_API_KEY)} />
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

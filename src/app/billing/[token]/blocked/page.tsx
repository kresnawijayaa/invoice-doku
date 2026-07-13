import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BillingReminderButton } from "@/components/billing-reminder-button";
import { formatDateTime } from "@/lib/format";
import { getClientBillingByToken } from "@/services/billing";
import { getBillingReminderLimit, sendBillingReminderAction } from "@/server/billing-reminder-actions";

type BlockedBillingPageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ status?: string; message?: string }>;
};

function maskEmail(value: string) {
  const [name, domain] = value.split("@");

  if (!name || !domain) {
    return value;
  }

  const visible = name.slice(0, Math.min(2, name.length));

  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

export async function generateMetadata({ params }: BlockedBillingPageProps): Promise<Metadata> {
  const { token } = await params;
  const billing = await getClientBillingByToken(token);

  return {
    title: billing ? `Akses Layanan - ${billing.client.companyName || billing.client.name}` : "Akses Layanan",
    robots: {
      index: false,
      follow: false
    }
  };
}

export default async function BlockedBillingPage({ params, searchParams }: BlockedBillingPageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const billing = await getClientBillingByToken(token);

  if (!billing) {
    notFound();
  }

  const limit = await getBillingReminderLimit(billing.client.id);
  const clientName = billing.client.companyName || billing.client.name;
  const serviceTitle = billing.overdueInvoices[0]?.title || billing.warningInvoices[0]?.title || "Tagihan operasional layanan";
  const maskedEmail = maskEmail(billing.client.email);

  return (
    <main className="min-h-screen bg-gray-100">
      <section className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-6">
        <div className="w-full rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line bg-gray-50 px-5 py-5 sm:px-8 sm:py-7">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Informasi Layanan</p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-ink sm:text-3xl">Akses layanan sementara dibatasi</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Beberapa informasi billing perlu ditinjau oleh pihak tertagih sebelum layanan dapat digunakan kembali.
            </p>
          </div>

          <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
            {query?.status === "sent" ? (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                Informasi billing sudah dikirim ke email tertagih.
              </div>
            ) : null}
            {query?.status === "limited" ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Pengiriman belum tersedia. Silakan tunggu beberapa menit atau coba lagi besok jika batas harian sudah tercapai.
              </div>
            ) : null}
            {query?.status === "error" ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {query.message || "Informasi billing belum berhasil dikirim."}
              </div>
            ) : null}

            <section className="rounded-lg border border-line p-4">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium uppercase text-muted">Layanan</dt>
                  <dd className="mt-1 break-words text-base font-semibold text-ink">{clientName}</dd>
                </div>
                <div>
                  <dt className="font-medium uppercase text-muted">Status</dt>
                  <dd className="mt-1 text-base font-semibold text-red-700">
                    {billing.action === "BLOCK" ? "Perlu tindak lanjut billing" : "Ada informasi billing aktif"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium uppercase text-muted">Informasi</dt>
                  <dd className="mt-1 break-words text-base font-semibold text-ink">{serviceTitle}</dd>
                </div>
              </dl>
            </section>

            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>
                Untuk menjaga privasi data billing, rincian tagihan hanya dikirim ke email tertagih yang terdaftar.
              </p>
              <p>
                Gunakan tombol di bawah untuk mengirimkan informasi billing ke <span className="font-semibold text-ink">{maskedEmail}</span>.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-gray-50 p-4">
              <BillingReminderButton
                action={sendBillingReminderAction}
                canSend={limit.canSend}
                nextAllowedAt={limit.nextAllowedAt?.toISOString() ?? null}
                remainingToday={limit.remainingToday}
                token={token}
              />
              <p className="mt-3 text-xs leading-5 text-muted">
                Sisa pengiriman hari ini: {limit.remainingToday} dari {limit.maxPerDay}.
                {limit.nextAllowedAt ? ` Dapat dikirim lagi setelah ${formatDateTime(limit.nextAllowedAt)}.` : ""}
              </p>
            </div>

            <div className="border-t border-line pt-5">
              <Link className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline" href="/">
                Kembali
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

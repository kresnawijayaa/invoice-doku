import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { generateRecurringPlanInvoiceAction } from "@/server/recurring-actions";

export default async function RecurringPlanDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; invoice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const plan = await prisma.recurringInvoicePlan.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!plan) {
    notFound();
  }

  const subtotal = plan.items.reduce((sum, item) => sum + Number(item.quantity.toString()) * Number(item.unitPrice.toString()), 0);
  const total = subtotal + Number(plan.taxAmount.toString()) - Number(plan.discountAmount.toString());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const billingUrl = plan.client.billingToken ? `${appUrl}/billing/${plan.client.billingToken}` : null;

  return (
    <main className="px-4 py-5 sm:p-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline" href="/recurring">
              Kembali ke recurring plans
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-ink">{plan.name}</h1>
            <p className="mt-2 text-sm text-muted">{plan.client.companyName || plan.client.name}</p>
          </div>
          <form action={generateRecurringPlanInvoiceAction}>
            <input name="id" type="hidden" value={plan.id} />
            <div className="grid gap-2 sm:flex">
              {billingUrl ? (
                <a className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink sm:w-auto" href={billingUrl} rel="noreferrer" target="_blank">
                  Billing Portal
                </a>
              ) : null}
              <button className="h-11 w-full rounded-md bg-ink px-4 text-sm font-medium text-white sm:w-auto" type="submit">
                Generate Bulan Ini
              </button>
            </div>
          </form>
        </div>

        {query?.success === "created" ? <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Recurring plan berhasil dibuat.</div> : null}
        {query?.success === "generated" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Invoice recurring berhasil digenerate. {query.invoice ? <Link className="font-semibold underline" href={`/invoices/${query.invoice}`}>Buka invoice</Link> : null}
          </div>
        ) : null}
        {query?.error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{query.error}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-ink">Item Tagihan</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase text-muted">
                  <tr>
                    <th className="pb-3 font-semibold">Deskripsi</th>
                    <th className="pb-3 text-right font-semibold">Qty</th>
                    <th className="pb-3 text-right font-semibold">Harga</th>
                    <th className="pb-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {plan.items.map((item) => {
                    const itemTotal = Number(item.quantity.toString()) * Number(item.unitPrice.toString());

                    return (
                      <tr key={item.id}>
                        <td className="py-4 pr-4 font-medium text-ink">{item.description}</td>
                        <td className="py-4 text-right text-muted">{item.quantity.toString()}</td>
                        <td className="py-4 text-right text-muted">{formatCurrency(item.unitPrice.toString())}</td>
                        <td className="py-4 text-right font-semibold text-ink">{formatCurrency(String(itemTotal))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-ink">Schedule</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Generate</dt>
                <dd className="font-medium text-ink">Tanggal {plan.issueDay}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Due</dt>
                <dd className="font-medium text-ink">Tanggal {plan.dueDay}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Gateway</dt>
                <dd className="font-medium text-ink">{plan.paymentProvider === "MIDTRANS" ? "Midtrans" : "DOKU"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Last Period</dt>
                <dd className="font-medium text-ink">{plan.lastGeneratedPeriod || "-"}</dd>
              </div>
              <div className="border-t border-line pt-3">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-medium text-ink">{formatCurrency(String(subtotal))}</dd>
                </div>
                <div className="mt-3 flex justify-between gap-3">
                  <dt className="text-muted">Total</dt>
                  <dd className="font-semibold text-ink">{formatCurrency(String(total))}</dd>
                </div>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}

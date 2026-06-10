import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteInvoiceAction, sendInvoiceAction, syncDokuPaymentStatusAction, updateInvoiceStatusAction } from "@/server/invoice-actions";

export default async function InvoiceDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        orderBy: { createdAt: "asc" }
      },
      payments: {
        orderBy: { createdAt: "desc" }
      },
      emailLogs: {
        orderBy: { createdAt: "desc" }
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  if (!invoice) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${appUrl}/invoice/${invoice.publicToken}`;

  return (
    <main className="px-4 py-5 sm:p-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline" href="/invoices">
              Kembali ke invoices
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="mt-2 text-sm text-muted">{invoice.title}</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap">
            {invoice.status !== "PAID" ? (
              <Link className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-medium text-ink" href={`/invoices/${invoice.id}/edit`}>
                Edit Invoice
              </Link>
            ) : null}
            <form action={sendInvoiceAction}>
              <input name="id" type="hidden" value={invoice.id} />
              <button className="h-10 w-full rounded-md bg-ink px-3 text-sm font-medium text-white" type="submit">
                Send Invoice
              </button>
            </form>
            <form action={syncDokuPaymentStatusAction}>
              <input name="id" type="hidden" value={invoice.id} />
              <button className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink" type="submit">
                Sync DOKU
              </button>
            </form>
            <form action={updateInvoiceStatusAction} className="grid grid-cols-[1fr_auto] gap-2 sm:col-span-2 lg:col-span-1">
              <input name="id" type="hidden" value={invoice.id} />
              <select className="h-10 min-w-0 rounded-md border border-line bg-white px-3 text-sm" name="status" defaultValue={invoice.status}>
                {["DRAFT", "SENT", "UNPAID", "PAID", "OVERDUE", "CANCELLED"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="h-10 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink" type="submit">
                Update
              </button>
            </form>
            <form action={deleteInvoiceAction}>
              <input name="id" type="hidden" value={invoice.id} />
              <button className="h-10 w-full rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700" type="submit">
                Hapus
              </button>
            </form>
          </div>
        </div>

        {query?.success === "created" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Invoice berhasil dibuat.
          </div>
        ) : null}
        {query?.success === "status" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Status invoice berhasil diperbarui.
          </div>
        ) : null}
        {query?.success === "email" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Invoice berhasil dikirim ke {invoice.client.email}.
          </div>
        ) : null}
        {query?.success === "payment-sync" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Status pembayaran DOKU berhasil disinkronkan.
          </div>
        ) : null}
        {query?.success === "updated" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Invoice berhasil diperbarui.
          </div>
        ) : null}
        {query?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{query.error}</div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-muted">Client</p>
                <p className="mt-1 font-medium text-ink">{invoice.client.name}</p>
                <p className="text-sm text-muted">{invoice.client.companyName || "-"}</p>
                <p className="text-sm text-muted">{invoice.client.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted">Tanggal</p>
                <p className="mt-1 text-sm text-ink">Issue: {formatDate(invoice.issueDate)}</p>
                <p className="text-sm text-ink">Due: {formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {invoice.items.map((item) => (
                <article key={item.id} className="rounded-md border border-line p-4">
                  <p className="font-medium leading-6 text-ink">{item.description}</p>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted">Qty</p>
                      <p className="mt-1 text-ink">{item.quantity.toString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase text-muted">Harga</p>
                      <p className="mt-1 text-ink">{formatCurrency(item.unitPrice.toString())}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase text-muted">Total</p>
                      <p className="mt-1 font-semibold text-ink">{formatCurrency(item.totalPrice.toString())}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-md border border-line md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Deskripsi</th>
                    <th className="px-4 py-3 text-right font-semibold">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold">Harga</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-ink">{item.description}</td>
                      <td className="px-4 py-3 text-right text-muted">{item.quantity.toString()}</td>
                      <td className="px-4 py-3 text-right text-muted">{formatCurrency(item.unitPrice.toString())}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">{formatCurrency(item.totalPrice.toString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invoice.notes ? <p className="mt-4 text-sm text-muted">{invoice.notes}</p> : null}
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-ink">Ringkasan</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-medium text-ink">{formatCurrency(invoice.subtotal.toString())}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Pajak</dt>
                  <dd className="font-medium text-ink">{formatCurrency(invoice.taxAmount.toString())}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Diskon</dt>
                  <dd className="font-medium text-ink">{formatCurrency(invoice.discountAmount.toString())}</dd>
                </div>
                <div className="border-t border-line pt-3">
                  <div className="flex justify-between text-base">
                    <dt className="font-semibold text-ink">Total</dt>
                    <dd className="font-semibold text-ink">{formatCurrency(invoice.totalAmount.toString())}</dd>
                  </div>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-ink">Public Link</h2>
              <p className="mt-2 break-all text-sm text-muted">{publicUrl}</p>
              <Link className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white sm:w-auto" href={`/invoice/${invoice.publicToken}`}>
                Buka Invoice
              </Link>
              <Link
                className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink sm:ml-2 sm:mt-4 sm:w-auto"
                href={`/invoice/${invoice.publicToken}/pdf`}
              >
                Download PDF
              </Link>
            </section>

            <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-ink">Payment Log</h2>
              {invoice.payments.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {invoice.payments.map((payment) => (
                    <article key={payment.id} className="rounded-md border border-line p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-ink">{payment.provider}</span>
                        <StatusBadge status={payment.status} />
                      </div>
                      <dl className="mt-3 space-y-2">
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Amount</dt>
                          <dd className="font-medium text-ink">{formatCurrency(payment.amount.toString())}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Method</dt>
                          <dd className="break-all text-right font-medium text-ink">{payment.paymentMethod || "-"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Transaction ID</dt>
                          <dd className="break-all text-right font-medium text-ink">{payment.providerTransactionId || "-"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Created</dt>
                          <dd className="text-right font-medium text-ink">{formatDateTime(payment.createdAt)}</dd>
                        </div>
                        {payment.paidAt ? (
                          <div className="flex justify-between gap-3">
                            <dt className="text-muted">Paid</dt>
                            <dd className="text-right font-medium text-ink">{formatDateTime(payment.paidAt)}</dd>
                          </div>
                        ) : null}
                      </dl>
                      {payment.paymentUrl ? (
                        <Link
                          className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md border border-line bg-white px-3 font-medium text-ink"
                          href={payment.paymentUrl}
                        >
                          Buka Payment URL
                        </Link>
                      ) : null}
                      {payment.rawCallback ? (
                        <details className="mt-3 rounded-md bg-gray-50 px-3 py-2">
                          <summary className="cursor-pointer text-xs font-medium uppercase text-muted">Raw callback</summary>
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-muted">
                            {JSON.stringify(payment.rawCallback, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">Belum ada payment request atau callback.</p>
              )}
            </section>

            <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-ink">Email Log</h2>
              {invoice.emailLogs.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {invoice.emailLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="rounded-md border border-line p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-ink">{log.status}</span>
                        <span className="text-xs text-muted">{log.sentAt ? formatDate(log.sentAt) : formatDate(log.createdAt)}</span>
                      </div>
                      <p className="mt-1 break-all text-muted">{log.recipientEmail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">Belum ada email yang dikirim.</p>
              )}
            </section>

            <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-ink">Activity Log</h2>
              {invoice.activityLogs.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {invoice.activityLogs.map((log) => (
                    <article key={log.id} className="rounded-md border border-line p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-ink">{log.event}</span>
                        <span className="text-xs text-muted">{formatDateTime(log.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-muted">{log.message}</p>
                      <p className="mt-2 text-xs uppercase text-muted">Actor: {log.actor}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">Belum ada activity log.</p>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

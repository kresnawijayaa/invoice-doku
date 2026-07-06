import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { generateAllRecurringInvoicesAction } from "@/server/recurring-actions";

export default async function RecurringPlansPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; count?: string; error?: string }>;
}) {
  const params = await searchParams;
  const plans = await prisma.recurringInvoicePlan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: {
        select: {
          name: true,
          companyName: true
        }
      },
      items: true
    }
  });

  return (
    <main className="px-4 py-5 sm:p-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Billing</p>
            <h1 className="text-2xl font-semibold text-ink">Recurring Plans</h1>
          </div>
          <div className="grid gap-2 sm:flex">
            <form action={generateAllRecurringInvoicesAction}>
              <button className="h-11 w-full rounded-md border border-line bg-white px-4 text-sm font-medium text-ink sm:w-auto" type="submit">
                Generate Semua
              </button>
            </form>
            <Link className="inline-flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white sm:w-auto" href="/recurring/create">
              Buat Plan
            </Link>
          </div>
        </div>

        {params?.success === "generated-all" ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {params.count ?? 0} invoice recurring berhasil digenerate.
          </div>
        ) : null}
        {params?.error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</div> : null}

        <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Schedule</th>
                  <th className="px-4 py-3 font-semibold">Last Period</th>
                  <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {plans.length > 0 ? (
                  plans.map((plan) => {
                    const subtotal = plan.items.reduce((sum, item) => sum + Number(item.quantity.toString()) * Number(item.unitPrice.toString()), 0);

                    return (
                      <tr key={plan.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <p className="font-medium text-ink">{plan.name}</p>
                          <p className="mt-1 text-xs text-muted">{plan.isActive ? "Active" : "Inactive"}</p>
                        </td>
                        <td className="px-4 py-4 text-muted">{plan.client.companyName || plan.client.name}</td>
                        <td className="px-4 py-4 text-muted">Generate tgl {plan.issueDay}, due tgl {plan.dueDay}</td>
                        <td className="px-4 py-4 text-muted">{plan.lastGeneratedPeriod || "-"}</td>
                        <td className="px-4 py-4 text-right font-medium text-ink">{formatCurrency(String(subtotal))}</td>
                        <td className="px-4 py-4 text-right">
                          <Link className="font-medium text-ink underline-offset-4 hover:underline" href={`/recurring/${plan.id}`}>
                            Detail
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted" colSpan={6}>
                      Belum ada recurring plan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

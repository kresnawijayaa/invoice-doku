import Link from "next/link";
import { RecurringPlanForm } from "@/components/recurring-plan-form";
import { prisma } from "@/lib/prisma";
import { createRecurringPlanAction } from "@/server/recurring-actions";

export default async function CreateRecurringPlanPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const [params, clients] = await Promise.all([
    searchParams,
    prisma.client.findMany({
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        companyName: true
      }
    })
  ]);

  return (
    <main className="px-4 py-5 sm:p-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline" href="/recurring">
            Kembali ke recurring plans
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Buat Recurring Plan</h1>
          <p className="mt-2 text-sm text-muted">Plan ini dipakai untuk generate invoice bulanan secara manual sekarang, dan bisa diotomatisasi dengan cron nanti.</p>
        </div>
        {params?.error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</div> : null}
        <RecurringPlanForm action={createRecurringPlanAction} clients={clients} />
      </section>
    </main>
  );
}

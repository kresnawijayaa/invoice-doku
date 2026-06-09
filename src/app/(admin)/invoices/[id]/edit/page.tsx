import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InvoiceForm } from "@/components/invoice-form";
import { prisma } from "@/lib/prisma";
import { updateInvoiceAction } from "@/server/invoice-actions";

export default async function EditInvoicePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [invoice, clients] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: "asc" }
        }
      }
    }),
    prisma.client.findMany({
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        companyName: true
      }
    })
  ]);

  if (!invoice) {
    notFound();
  }

  if (invoice.status === "PAID") {
    redirect(`/invoices/${invoice.id}?error=${encodeURIComponent("Invoice yang sudah PAID tidak bisa diedit.")}`);
  }

  const invoiceFormValue = {
    id: invoice.id,
    clientId: invoice.clientId,
    title: invoice.title,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    taxAmount: invoice.taxAmount.toString(),
    discountAmount: invoice.discountAmount.toString(),
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString()
    }))
  };

  return (
    <main className="p-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline" href={`/invoices/${invoice.id}`}>
            Kembali ke detail invoice
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Edit Invoice</h1>
          <p className="mt-2 text-sm text-muted">
            {invoice.invoiceNumber} dapat diedit selama belum berstatus PAID. Nomor invoice dan public link tetap dipertahankan.
          </p>
        </div>

        {query?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{query.error}</div>
        ) : null}

        <InvoiceForm action={updateInvoiceAction} clients={clients} invoice={invoiceFormValue} submitLabel="Simpan Perubahan" />
      </section>
    </main>
  );
}

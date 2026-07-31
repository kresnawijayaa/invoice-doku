"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type RecurringPlanFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  clients: Array<{
    id: string;
    name: string;
    companyName: string | null;
  }>;
};

type DraftItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

const defaultItems: DraftItem[] = [
  {
    id: crypto.randomUUID(),
    description: "VPS Biznet 2vCPU/4GB/80GB",
    quantity: "1",
    unitPrice: "250000"
  },
  {
    id: crypto.randomUUID(),
    description: "Backup server",
    quantity: "1",
    unitPrice: "100000"
  },
  {
    id: crypto.randomUUID(),
    description: "Cloudflare R2 / storage proof",
    quantity: "1",
    unitPrice: "63600"
  },
  {
    id: crypto.randomUUID(),
    description: "Maintenance ringan sistem LMS",
    quantity: "1",
    unitPrice: "100000"
  }
];

function createEmptyItem(): DraftItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitPrice: ""
  };
}

export function RecurringPlanForm({ action, clients }: RecurringPlanFormProps) {
  const [items, setItems] = useState(defaultItems);
  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);

  function updateItem(id: string, field: keyof Omit<DraftItem, "id">, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function removeItem(id: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  }

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Client</span>
            <select className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink" name="clientId" required>
              <option value="">Pilih client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName ? `${client.companyName} - ${client.name}` : client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Nama Plan</span>
            <input className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink" name="name" defaultValue="Operasional LMS Bulanan" required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Payment Gateway</span>
            <select
              className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              name="paymentProvider"
              defaultValue="DOKU"
              required
            >
              <option value="DOKU">DOKU</option>
              <option value="MIDTRANS">Midtrans</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-ink">Template Judul Invoice</span>
            <input
              className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              name="titleTemplate"
              defaultValue="Tagihan Operasional LMS Jedeta - {bulan} {tahun}"
              required
            />
            <span className="mt-1 block text-xs text-muted">Gunakan {"{bulan}"} dan {"{tahun}"} untuk periode otomatis.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Generate Tanggal</span>
            <input className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink" name="issueDay" type="number" min="1" max="28" defaultValue="1" required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Due Date Tanggal</span>
            <input className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink" name="dueDay" type="number" min="1" max="28" defaultValue="10" required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Pajak</span>
            <input className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink" name="taxAmount" type="number" min="0" defaultValue="0" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Diskon</span>
            <input className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink" name="discountAmount" type="number" min="0" defaultValue="0" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-ink">Catatan</span>
            <textarea className="mt-2 min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink" name="notes" />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-ink">Item Tagihan Rutin</h2>
          <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink sm:w-auto" type="button" onClick={() => setItems((current) => [...current, createEmptyItem()])}>
            <Plus className="h-4 w-4" />
            Tambah Item
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-md border border-line p-3 md:grid-cols-[1fr_120px_160px_44px]">
              <label className="block">
                <span className="text-xs font-medium text-muted">Deskripsi</span>
                <input className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink" name="itemDescription" value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} placeholder={`Item ${index + 1}`} required />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Qty</span>
                <input className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink" name="itemQuantity" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} required />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Harga Satuan</span>
                <input className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink" name="itemUnitPrice" type="number" min="0" step="1" value={item.unitPrice} onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)} required />
              </label>
              <button className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white text-muted hover:text-red-700 md:mt-5" type="button" aria-label="Hapus item" onClick={() => removeItem(item.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end text-sm">
          <div className="w-full max-w-xs rounded-md bg-gray-50 p-4">
            <div className="flex justify-between text-muted">
              <span>Subtotal preview</span>
              <span>Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button className="h-11 w-full rounded-md bg-ink px-4 text-sm font-medium text-white sm:w-auto" type="submit">
          Simpan Recurring Plan
        </button>
      </div>
    </form>
  );
}

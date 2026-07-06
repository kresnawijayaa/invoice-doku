type ClientFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  client?: {
    id: string;
    name: string;
    companyName: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    billingEnabled?: boolean;
    gracePeriodDays?: number;
  };
  submitLabel: string;
};

export function ClientForm({ action, client, submitLabel }: ClientFormProps) {
  return (
    <form action={action} className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
      {client ? <input name="id" type="hidden" value={client.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink">Nama Client</span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
            name="name"
            type="text"
            defaultValue={client?.name}
            placeholder="Tante Ririn"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Perusahaan</span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
            name="companyName"
            type="text"
            defaultValue={client?.companyName ?? ""}
            placeholder="Jedeta Anugerah Logistik"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
            name="email"
            type="email"
            defaultValue={client?.email}
            placeholder="client@example.com"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Telepon</span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
            name="phone"
            type="tel"
            defaultValue={client?.phone ?? ""}
            placeholder="+62..."
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-ink">Alamat</span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
            name="address"
            defaultValue={client?.address ?? ""}
            placeholder="Alamat penagihan"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Grace Period Billing</span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
            name="gracePeriodDays"
            type="number"
            min="0"
            max="60"
            step="1"
            defaultValue={client?.gracePeriodDays ?? 0}
          />
          <span className="mt-1 block text-xs text-muted">Jumlah hari setelah due date sebelum akses project dibatasi.</span>
        </label>
        <label className="flex items-start gap-3 rounded-md border border-line bg-gray-50 p-3">
          <input
            className="mt-1 h-4 w-4"
            name="billingEnabled"
            type="checkbox"
            defaultChecked={client?.billingEnabled ?? true}
          />
          <span>
            <span className="block text-sm font-medium text-ink">Billing access check aktif</span>
            <span className="mt-1 block text-xs leading-5 text-muted">Project eksternal boleh memakai status billing client ini untuk gating akses.</span>
          </span>
        </label>
      </div>
      <div className="mt-6 flex justify-end">
        <button className="h-11 w-full rounded-md bg-ink px-4 text-sm font-medium text-white sm:w-auto" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

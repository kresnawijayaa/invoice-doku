import clsx from "clsx";

const styles: Record<string, string> = {
  DRAFT: "border-gray-200 bg-gray-50 text-gray-700",
  SENT: "border-blue-200 bg-blue-50 text-blue-700",
  UNPAID: "border-amber-200 bg-amber-50 text-amber-700",
  PAID: "border-green-200 bg-green-50 text-green-700",
  PENDING: "border-blue-200 bg-blue-50 text-blue-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  EXPIRED: "border-amber-200 bg-amber-50 text-amber-700",
  OVERDUE: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-gray-300 bg-white text-gray-500"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex rounded-full border px-2 py-1 text-xs font-medium", styles[status] ?? styles.DRAFT)}>
      {status}
    </span>
  );
}

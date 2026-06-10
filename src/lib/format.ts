import { format } from "date-fns";
import { id } from "date-fns/locale";

export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function formatDate(value: Date) {
  return format(value, "d MMMM yyyy", { locale: id });
}

export function formatDateTime(value: Date) {
  return format(value, "d MMMM yyyy HH:mm", { locale: id });
}

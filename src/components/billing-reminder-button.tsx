"use client";

import { useEffect, useMemo, useState } from "react";

type BillingReminderButtonProps = {
  token: string;
  action: (formData: FormData) => void | Promise<void>;
  canSend: boolean;
  nextAllowedAt: string | null;
  remainingToday: number;
};

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function BillingReminderButton({ token, action, canSend, nextAllowedAt, remainingToday }: BillingReminderButtonProps) {
  const nextAllowedTime = useMemo(() => (nextAllowedAt ? new Date(nextAllowedAt).getTime() : null), [nextAllowedAt]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!nextAllowedTime || nextAllowedTime <= Date.now()) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [nextAllowedTime]);

  const remainingMs = nextAllowedTime ? nextAllowedTime - now : 0;
  const isCoolingDown = remainingMs > 0;
  const isDisabled = !canSend || isCoolingDown || remainingToday <= 0;
  const label =
    remainingToday <= 0
      ? "Batas harian tercapai"
      : isCoolingDown
        ? `Kirim lagi dalam ${formatRemaining(remainingMs)}`
        : "Kirim info ke email tertagih";

  return (
    <form action={action}>
      <input name="token" type="hidden" value={token} />
      <button
        className="h-11 w-full rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
        disabled={isDisabled}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

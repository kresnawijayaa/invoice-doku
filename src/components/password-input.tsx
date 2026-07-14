"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PasswordInput() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-2">
      <input
        name="password"
        className="h-10 w-full rounded-md border border-line bg-white px-3 pr-11 text-sm outline-none focus:border-ink"
        type={visible ? "text" : "password"}
        placeholder="Password admin"
        autoComplete="current-password"
        required
      />
      <button
        aria-label={visible ? "Sembunyikan password" : "Lihat password"}
        className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-gray-100 hover:text-ink"
        type="button"
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

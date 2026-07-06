import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/server/auth-actions";
import { getCurrentUser } from "@/lib/auth";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
  { href: "/recurring", label: "Recurring" },
  { href: "/settings/payment", label: "Payment" },
  { href: "/settings/email", label: "Email" }
];

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="shrink-0 text-base font-semibold text-ink">
            Invoice DOKU
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-gray-100 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
            <form action={logoutAction}>
              <button className="h-10 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink" type="submit">
                Logout
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-10 shrink-0 items-center rounded-md px-3 text-sm font-medium text-muted hover:bg-gray-100 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}

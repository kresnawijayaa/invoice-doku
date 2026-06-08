import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/server/auth-actions";
import { getCurrentUser } from "@/lib/auth";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-base font-semibold text-ink">
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
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
            <form action={logoutAction}>
              <button className="h-9 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink" type="submit">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

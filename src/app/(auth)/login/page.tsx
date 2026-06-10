import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loginAction } from "@/server/auth-actions";

const errorMessages: Record<string, string> = {
  invalid: "Email atau password salah.",
  required: "Email dan password wajib diisi."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = params?.error ? errorMessages[params.error] : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6">
      <section className="w-full max-w-sm rounded-lg border border-line bg-panel p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-ink">Login Admin</h1>
        <p className="mt-2 text-sm text-muted">Masuk dengan akun admin dari seed database.</p>
        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              name="email"
              className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              type="email"
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              name="password"
              className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              type="password"
              placeholder="Password admin"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="h-11 w-full rounded-md bg-ink text-sm font-medium text-white" type="submit">
            Masuk
          </button>
        </form>
      </section>
    </main>
  );
}

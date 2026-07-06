import { NextResponse } from "next/server";
import { generateAllRecurringInvoices } from "@/services/recurring-invoices";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const cronSecretHeader = request.headers.get("x-cron-secret");

  return authHeader === `Bearer ${secret}` || cronSecretHeader === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const results = await generateAllRecurringInvoices(new Date(), { onlyScheduledToday: true });
  const generated = results.filter((result) => result.ok).length;

  return NextResponse.json({
    message: "Recurring invoice cron processed.",
    generated,
    skippedOrFailed: results.length - generated,
    results
  });
}

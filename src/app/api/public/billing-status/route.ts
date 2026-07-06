import { NextResponse } from "next/server";
import { getClientBillingByToken, toBillingStatusResponse } from "@/services/billing";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ message: "Billing token wajib diisi." }, { status: 400 });
  }

  const billing = await getClientBillingByToken(token);

  if (!billing) {
    return NextResponse.json({ message: "Billing client tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json(toBillingStatusResponse(billing), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

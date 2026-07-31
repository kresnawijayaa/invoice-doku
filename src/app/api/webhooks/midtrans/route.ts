import { NextResponse } from "next/server";
import { handleMidtransNotification, verifyMidtransNotification } from "@/services/midtrans";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!verifyMidtransNotification(payload)) {
      console.error("[Midtrans webhook] Invalid signature");
      return NextResponse.json({ message: "Invalid Midtrans signature." }, { status: 401 });
    }

    const result = await handleMidtransNotification(payload);
    return NextResponse.json({ message: "Midtrans notification processed.", result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Midtrans notification failed.";
    console.error("[Midtrans webhook] Processing failed", { message });
    return NextResponse.json({ message }, { status: 400 });
  }
}

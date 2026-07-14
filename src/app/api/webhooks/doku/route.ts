import { NextResponse } from "next/server";
import { handleDokuCallback, verifyDokuCallback } from "@/services/doku";

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyDokuCallback(rawBody, request.headers)) {
    console.error("[DOKU webhook] Invalid callback signature", {
      clientId: request.headers.get("Client-Id"),
      requestId: request.headers.get("Request-Id"),
      requestTimestamp: request.headers.get("Request-Timestamp"),
      bodyLength: rawBody.length
    });

    return NextResponse.json(
      {
        message: "Invalid DOKU callback signature."
      },
      { status: 401 }
    );
  }

  try {
    const payload = JSON.parse(rawBody);
    const result = await handleDokuCallback(payload);

    return NextResponse.json({
      message: "DOKU callback processed.",
      result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DOKU callback failed.";

    console.error("[DOKU webhook] Callback processing failed", {
      message,
      error,
      body: rawBody
    });

    return NextResponse.json(
      {
        message
      },
      { status: 400 }
    );
  }
}

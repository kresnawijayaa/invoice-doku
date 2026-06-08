import { NextResponse } from "next/server";
import { handleDokuCallback, verifyDokuCallback } from "@/services/doku";

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyDokuCallback(rawBody, request.headers)) {
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

    return NextResponse.json(
      {
        message
      },
      { status: 400 }
    );
  }
}

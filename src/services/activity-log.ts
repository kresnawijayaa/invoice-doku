import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ActivityLogInput = {
  invoiceId?: string | null;
  actor?: string;
  event: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createActivityLog({
  invoiceId,
  actor = "system",
  event,
  message,
  metadata
}: ActivityLogInput) {
  await prisma.activityLog.create({
    data: {
      invoiceId: invoiceId ?? null,
      actor,
      event,
      message,
      metadata
    }
  });
}

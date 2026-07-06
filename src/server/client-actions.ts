"use server";

import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  name: z.string().trim().min(1, "Nama client wajib diisi."),
  companyName: z.string().trim().optional(),
  email: z.string().trim().email("Email tidak valid."),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  billingEnabled: z.coerce.boolean().default(true),
  gracePeriodDays: z.coerce.number().int().min(0).max(60).default(0)
});

function createBillingToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getClientPayload(formData: FormData, errorPath: string) {
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    billingEnabled: formData.get("billingEnabled") === "on",
    gracePeriodDays: formData.get("gracePeriodDays") || 0
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Input client tidak valid.";
    redirect(`${errorPath}?error=${encodeURIComponent(message)}`);
  }

  return {
    name: parsed.data.name,
    companyName: parsed.data.companyName || null,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone || null,
    address: parsed.data.address || null,
    billingEnabled: parsed.data.billingEnabled,
    gracePeriodDays: parsed.data.gracePeriodDays
  };
}

export async function createClientAction(formData: FormData) {
  const payload = getClientPayload(formData, "/clients/create");

  const client = await prisma.client.create({
    data: {
      ...payload,
      billingToken: createBillingToken()
    },
    select: { id: true }
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}?success=created`);
}

export async function updateClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/clients?error=Client tidak ditemukan.");
  }

  const payload = getClientPayload(formData, `/clients/${id}`);

  await prisma.client.update({
    where: { id },
    data: payload
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}?success=updated`);
}

export async function deleteClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/clients?error=Client tidak ditemukan.");
  }

  try {
    await prisma.client.delete({
      where: { id }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirect(`/clients/${id}?error=${encodeURIComponent("Client sudah memiliki invoice dan tidak bisa dihapus.")}`);
    }

    throw error;
  }

  revalidatePath("/clients");
  redirect("/clients?success=deleted");
}

export async function generateClientBillingTokenAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/clients?error=Client tidak ditemukan.");
  }

  await prisma.client.update({
    where: { id },
    data: {
      billingToken: createBillingToken(),
      billingEnabled: true
    }
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}?success=billing-token`);
}

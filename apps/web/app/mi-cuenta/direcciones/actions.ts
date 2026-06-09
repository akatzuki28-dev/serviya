"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export interface AddressInput {
  label: string | null;
  street: string;
  city: string;
  isDefault?: boolean;
}

type Result = { ok: true } | { ok: false; error: string };

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-admin-secret": process.env.ADMIN_SECRET ?? "",
  };
}

export async function addAddress(input: AddressInput): Promise<Result> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "No autorizado" };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${encodeURIComponent(userId)}/addresses`,
      {
        method: "POST",
        cache: "no-store",
        headers: apiHeaders(),
        body: JSON.stringify(input),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
    }
    revalidatePath("/mi-cuenta/direcciones");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function updateAddress(
  addressId: string,
  input: AddressInput
): Promise<Result> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "No autorizado" };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}`,
      {
        method: "PUT",
        cache: "no-store",
        headers: apiHeaders(),
        body: JSON.stringify(input),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
    }
    revalidatePath("/mi-cuenta/direcciones");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function deleteAddress(addressId: string): Promise<Result> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "No autorizado" };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}`,
      {
        method: "DELETE",
        cache: "no-store",
        headers: apiHeaders(),
      }
    );
    if (res.status !== 204) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
    }
    revalidatePath("/mi-cuenta/direcciones");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function setDefaultAddress(addressId: string): Promise<Result> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "No autorizado" };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}/default`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: apiHeaders(),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
    }
    revalidatePath("/mi-cuenta/direcciones");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

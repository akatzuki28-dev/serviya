"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

async function assertAdmin(): Promise<boolean> {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

export async function deleteOrder(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await assertAdmin())) return { ok: false, error: "No autorizado" };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    if (res.status === 204) {
      revalidatePath("/admin/ordenes");
      return { ok: true };
    }
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export const ORDER_STATUSES = [
  "PENDIENTE_PAGO",
  "PAGADA",
  "CONFIRMADA",
  "EN_CAMINO",
  "EN_PROGRESO",
  "COMPLETADA",
  "CANCELADA",
  "PAGO_FALLIDO",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export async function setOrderStatus(
  id: string,
  status: OrderStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await assertAdmin())) return { ok: false, error: "No autorizado" };
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Estado inválido" };
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": process.env.ADMIN_SECRET ?? "",
        },
        body: JSON.stringify({ status }),
      }
    );
    if (res.ok) {
      revalidatePath("/admin/ordenes");
      return { ok: true };
    }
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

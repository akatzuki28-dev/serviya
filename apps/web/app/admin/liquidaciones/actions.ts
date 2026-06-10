"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

type Result = { ok: true } | { ok: false; error: string };

async function assertAdmin(): Promise<boolean> {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-admin-secret": process.env.ADMIN_SECRET ?? "",
  };
}

export async function setPayoutStatus(
  id: string,
  status: "PENDIENTE" | "PAGADO"
): Promise<Result> {
  if (!(await assertAdmin())) return { ok: false, error: "No autorizado" };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/payouts/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: apiHeaders(),
        body: JSON.stringify({ status }),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
    }
    revalidatePath("/admin/liquidaciones");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function generatePayouts(): Promise<
  { ok: true; generated: number } | { ok: false; error: string }
> {
  if (!(await assertAdmin())) return { ok: false, error: "No autorizado" };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/payouts/generate`,
      {
        method: "POST",
        cache: "no-store",
        headers: apiHeaders(),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
    }
    const data = (await res.json()) as { generated: number };
    revalidatePath("/admin/liquidaciones");
    return { ok: true, generated: data.generated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

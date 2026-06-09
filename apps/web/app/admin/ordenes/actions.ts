"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function deleteOrder(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return { ok: false, error: "No autorizado" };

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

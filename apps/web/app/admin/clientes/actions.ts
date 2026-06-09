"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export type AdminRole = "CLIENT" | "PROVIDER" | "ADMIN";

export interface AdminClient {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  image: string | null;
  role: AdminRole;
  authProvider: string;
  createdAt: string;
  ordersCount?: number;
}

async function getSession() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const id = (session?.user as { id?: string } | undefined)?.id;
  return { role, id };
}

function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-admin-secret": process.env.ADMIN_SECRET ?? "",
  };
}

export async function updateUser(
  id: string,
  patch: { role?: AdminRole; name?: string | null; phone?: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (session.role !== "ADMIN") return { ok: false, error: "No autorizado" };

  // Guard: no permitir que un admin se quite el rol ADMIN a sí mismo.
  if (patch.role && patch.role !== "ADMIN" && session.id === id) {
    return {
      ok: false,
      error: "No podés quitarte tu propio rol ADMIN. Pedile a otro admin que lo haga.",
    };
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: apiHeaders(),
        body: JSON.stringify(patch),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
    }
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${id}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

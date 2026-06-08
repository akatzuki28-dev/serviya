"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export interface UpdateServiceInput {
  slug: string;
  basePrice?: number;
  description?: string | null;
  comingSoon?: boolean;
}

export async function updateService(
  input: UpdateServiceInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return { ok: false, error: "No autorizado" };
  }

  const { slug, ...patch } = input;
  if (!slug) return { ok: false, error: "Slug requerido" };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/${encodeURIComponent(slug)}`,
      {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": process.env.ADMIN_SECRET ?? "",
        },
        body: JSON.stringify(patch),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
    }

    // Invalidar caches del front
    revalidatePath("/reservar");
    revalidatePath("/admin/precios");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

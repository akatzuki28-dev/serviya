"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export interface ProviderInput {
  name: string;
  phone: string | null;
  serviceCategories: string[];
  coverageZones: string[];
  isActive: boolean;
}

async function assertAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return { ok: false, error: "No autorizado" };
  return { ok: true };
}

function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-admin-secret": process.env.ADMIN_SECRET ?? "",
  };
}

export async function createProvider(
  input: ProviderInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/providers`,
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
    const created = (await res.json()) as { id: string };
    revalidatePath("/admin/proveedores");
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function updateProvider(
  id: string,
  patch: Partial<ProviderInput>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/providers/${encodeURIComponent(id)}`,
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
    revalidatePath("/admin/proveedores");
    revalidatePath(`/admin/proveedores/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function toggleProviderActive(
  id: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  return updateProvider(id, { isActive });
}

export async function createProviderAndRedirect(input: ProviderInput) {
  const result = await createProvider(input);
  if (result.ok) {
    redirect("/admin/proveedores");
  }
  return result;
}

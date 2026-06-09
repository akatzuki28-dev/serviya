"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

type Result = { ok: true } | { ok: false; error: string };

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function createReview(input: {
  orderId: string;
  rating: number;
  comment: string | null;
}): Promise<Result> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "No autorizado" };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${encodeURIComponent(userId)}/reviews`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": process.env.ADMIN_SECRET ?? "",
        },
        body: JSON.stringify(input),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Error ${res.status}: ${body || "fallo del API"}` };
    }
    revalidatePath("/mi-cuenta/resenas");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

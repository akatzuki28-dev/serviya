import type { Metadata } from "next";
import { auth } from "@/auth";
import { ReviewsManager, type Review, type ReviewableOrder } from "./ReviewsManager";

export const metadata: Metadata = { title: "Mis reseñas" };

async function adminFetch(path: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      cache: "no-store",
      headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export default async function MisResenasPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [reviews, orders] = userId
    ? await Promise.all([
        adminFetch(`/api/admin/users/${userId}/reviews`),
        adminFetch(`/api/admin/users/${userId}/orders`),
      ])
    : [null, null];

  const reviewList: Review[] = reviews ?? [];
  const reviewedOrderIds = new Set(reviewList.map((r) => r.orderId));

  // Órdenes completadas todavía sin reseña → se pueden calificar.
  const reviewable: ReviewableOrder[] = (orders ?? [])
    .filter(
      (o: { status: string; id: string }) =>
        o.status === "COMPLETADA" && !reviewedOrderIds.has(o.id)
    )
    .map((o: { id: string; serviceType: string; scheduledAt: string; provider?: { name: string } | null }) => ({
      id: o.id,
      serviceType: o.serviceType,
      scheduledAt: o.scheduledAt,
      providerName: o.provider?.name ?? null,
    }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-foreground">Mis reseñas</h1>
        <p className="mt-1 text-sm text-muted">
          Calificá los servicios que completaste y revisá tus opiniones
        </p>
      </div>

      <ReviewsManager reviews={reviewList} reviewable={reviewable} />
    </div>
  );
}

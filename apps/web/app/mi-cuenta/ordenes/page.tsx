import type { Metadata } from "next";
import { auth } from "@/auth";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Calendar, ArrowRight, ShoppingBag } from "lucide-react";

export const metadata: Metadata = { title: "Mis órdenes" };

async function getUserOrders(userId: string) {
  try {
    // El server component ya autenticó la sesión y el userId es el del
    // usuario logueado, así que confiamos vía admin-secret (server-to-server).
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/orders`,
      {
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function MisOrdenesPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const orders = userId ? await getUserOrders(userId) : [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Mis órdenes</h1>
          <p className="mt-1 text-sm text-muted">
            Historial de reservas y servicios
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/reservar">
            Nueva reserva
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
            <ShoppingBag className="h-6 w-6 text-muted" />
          </div>
          <p className="font-serif text-lg text-foreground">
            Todavía no tenés reservas
          </p>
          <p className="mt-1 text-sm text-muted">
            Cuando hagas tu primera reserva, va a aparecer acá.
          </p>
          <Button asChild className="mt-6">
            <Link href="/reservar">Reservar ahora</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-background p-5 transition-shadow hover:shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-serif text-base text-foreground capitalize">
                    {order.serviceType?.replace(/-/g, " ")}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatDate(order.scheduledAt)}
                  </p>
                  {order.provider && (
                    <p className="text-xs text-subtle">
                      Proveedor: {order.provider.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <OrderStatusBadge status={order.status} />
                <span className="font-serif text-lg text-foreground">
                  {formatCurrency(Number(order.grossAmount))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

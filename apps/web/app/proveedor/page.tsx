import type { Metadata } from "next";
import { auth } from "@/auth";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { Clock, MapPin, MessageSquare, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Mis trabajos de hoy" };

async function getProviderOrders(providerId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/providers/${providerId}/orders`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ProveedorPage() {
  const session = await auth();
  const providerId = (session?.user as any)?.id;
  const allOrders = providerId ? await getProviderOrders(providerId) : [];

  const today = new Date().toDateString();
  const todayOrders = allOrders.filter(
    (o: any) => new Date(o.scheduledAt).toDateString() === today
  );

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <CalendarCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">
            Trabajos de hoy
          </h1>
          <p className="text-sm text-muted">
            {todayOrders.length === 0
              ? "No tenés trabajos asignados"
              : `${todayOrders.length} trabajo${todayOrders.length !== 1 ? "s" : ""} programado${todayOrders.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {todayOrders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
            <CalendarCheck className="h-6 w-6 text-muted" />
          </div>
          <p className="font-serif text-lg text-foreground">
            Sin trabajos para hoy
          </p>
          <p className="mt-1 text-sm text-muted">
            Tus próximos trabajos van a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {todayOrders
            .sort(
              (a: any, b: any) =>
                new Date(a.scheduledAt).getTime() -
                new Date(b.scheduledAt).getTime()
            )
            .map((order: any) => (
              <div
                key={order.id}
                className="rounded-2xl border border-border bg-background p-6 transition-shadow hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-serif text-lg text-foreground capitalize">
                      {order.serviceType?.replace(/-/g, " ")}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(order.scheduledAt)}
                    </div>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {order.addressSnapshot && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-muted">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {order.addressSnapshot.street},{" "}
                      {order.addressSnapshot.city}
                    </span>
                  </div>
                )}

                {order.clientNotes && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-gold-light px-4 py-3 text-sm text-foreground">
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span>{order.clientNotes}</span>
                  </div>
                )}

                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  {order.status === "CONFIRMADA" && (
                    <StatusButton
                      orderId={order.id}
                      newStatus="EN_CAMINO"
                      label="En camino"
                    />
                  )}
                  {order.status === "EN_CAMINO" && (
                    <StatusButton
                      orderId={order.id}
                      newStatus="EN_PROGRESO"
                      label="Iniciar trabajo"
                    />
                  )}
                  {order.status === "EN_PROGRESO" && (
                    <StatusButton
                      orderId={order.id}
                      newStatus="COMPLETADA"
                      label="Completado"
                      variant="gold"
                    />
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function StatusButton({
  orderId,
  newStatus,
  label,
  variant = "primary",
}: {
  orderId: string;
  newStatus: string;
  label: string;
  variant?: "primary" | "gold";
}) {
  async function updateStatus() {
    "use server";
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }
    );
  }

  return (
    <form action={updateStatus}>
      <Button type="submit" variant={variant} size="sm">
        {label}
      </Button>
    </form>
  );
}

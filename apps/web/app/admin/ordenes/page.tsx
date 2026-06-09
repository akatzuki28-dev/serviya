import type { Metadata } from "next";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Package } from "lucide-react";

export const metadata: Metadata = { title: "Órdenes" };

async function getOrders() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders`,
      {
        cache: "no-store",
        headers: {
          "x-admin-secret": process.env.ADMIN_SECRET ?? "",
        },
      }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function AdminOrdenesPage() {
  const orders = await getOrders();

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">Órdenes</h1>
          <p className="text-sm text-muted">
            {orders.length} orden{orders.length !== 1 && "es"} en total
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background shadow-[var(--shadow-soft)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                ID
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                Servicio
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                Fecha
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                Estado
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                Monto
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                Pago
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order: any) => (
              <tr
                key={order.id}
                className="border-b border-border last:border-0 transition-colors hover:bg-surface cursor-pointer"
              >
                <td className="px-5 py-4 font-mono text-xs text-subtle">
                  {order.id.slice(0, 8)}
                </td>
                <td className="px-5 py-4">
                  <span className="font-medium text-foreground capitalize">
                    {order.serviceType?.replace(/-/g, " ")}
                  </span>
                </td>
                <td className="px-5 py-4 text-muted">
                  {formatDate(order.scheduledAt)}
                </td>
                <td className="px-5 py-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-5 py-4 font-serif text-foreground">
                  {formatCurrency(Number(order.grossAmount))}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
                    {order.paymentMethod === "mp_link"
                      ? "Mercado Pago"
                      : "Transferencia"}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-16 text-center text-muted"
                >
                  <Package className="mx-auto mb-3 h-8 w-8 text-subtle" />
                  <p className="font-serif text-base">No hay órdenes todavía</p>
                  <p className="mt-1 text-xs">
                    Las órdenes aparecerán acá cuando los clientes reserven.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Package, Trash2 } from "lucide-react";
import { deleteOrder } from "./actions";

export interface AdminOrder {
  id: string;
  serviceType: string;
  scheduledAt: string;
  status: string;
  grossAmount: string;
  paymentMethod: string;
  provider?: { name: string } | null;
}

export function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteOrder(id);
      setPendingId(null);
      setConfirmId(null);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
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
              <th className="px-5 py-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-border last:border-0 transition-colors hover:bg-surface"
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
                <td className="px-5 py-4 text-right">
                  {confirmId === order.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={pendingId === order.id}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground hover:bg-surface"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(order.id)}
                        disabled={pendingId === order.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-2.5 py-1.5 text-xs font-medium text-background hover:bg-danger/90 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        {pendingId === order.id ? "Eliminando..." : "Confirmar"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(order.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-muted">
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

"use client";

import { useState, useTransition } from "react";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Package, Trash2, Ban } from "lucide-react";
import { deleteOrder, cancelOrder } from "./actions";

export interface AdminOrder {
  id: string;
  serviceType: string;
  scheduledAt: string;
  status: string;
  grossAmount: string;
  paymentMethod: string;
  provider?: { name: string } | null;
}

type PendingAction = { id: string; kind: "delete" | "cancel" };

export function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  const [confirm, setConfirm] = useState<PendingAction | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function runAction(action: PendingAction) {
    setError(null);
    setPending(action);
    startTransition(async () => {
      const result =
        action.kind === "delete"
          ? await deleteOrder(action.id)
          : await cancelOrder(action.id);
      setPending(null);
      setConfirm(null);
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
                  {confirm?.id === order.id ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs text-muted">
                        {confirm.kind === "delete"
                          ? "¿Eliminar definitivamente?"
                          : "¿Cancelar esta orden?"}
                      </span>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirm(null)}
                          disabled={pending?.id === order.id}
                          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground hover:bg-surface"
                        >
                          Volver
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(confirm)}
                          disabled={pending?.id === order.id}
                          className={
                            confirm.kind === "delete"
                              ? "inline-flex items-center gap-1.5 rounded-lg bg-danger px-2.5 py-1.5 text-xs font-medium text-background hover:bg-danger/90 disabled:opacity-50"
                              : "inline-flex items-center gap-1.5 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
                          }
                        >
                          {confirm.kind === "delete" ? (
                            <Trash2 className="h-3 w-3" />
                          ) : (
                            <Ban className="h-3 w-3" />
                          )}
                          {pending?.id === order.id
                            ? confirm.kind === "delete"
                              ? "Eliminando..."
                              : "Cancelando..."
                            : "Confirmar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {order.status !== "CANCELADA" && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({ id: order.id, kind: "cancel" })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
                        >
                          <Ban className="h-3 w-3" />
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({ id: order.id, kind: "delete" })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </button>
                    </div>
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

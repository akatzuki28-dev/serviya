"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Package, Trash2, Loader2, Check } from "lucide-react";
import { deleteOrder, setOrderStatus, setOrderProvider } from "./actions";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  STATUS_DOT,
  type OrderStatus,
} from "./statuses";

export interface ProviderOption {
  id: string;
  name: string;
}

export interface AdminOrder {
  id: string;
  serviceType: string;
  scheduledAt: string;
  status: string;
  grossAmount: string;
  paymentMethod: string;
  providerId?: string | null;
  provider?: { name: string } | null;
}

export function OrdersTable({
  orders,
  providers = [],
}: {
  orders: AdminOrder[];
  providers?: ProviderOption[];
}) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  // Estado local por fila para reflejar el cambio de status sin recargar.
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(safeOrders.map((o) => [o.id, o.status]))
  );
  // Estado local del proveedor asignado por fila ("" = sin asignar).
  const [providerIds, setProviderIds] = useState<Record<string, string>>(() =>
    Object.fromEntries(safeOrders.map((o) => [o.id, o.providerId ?? ""]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleStatusChange(id: string, next: OrderStatus) {
    const prev = statuses[id];
    setError(null);
    setSavedId(null);
    setStatuses((s) => ({ ...s, [id]: next })); // optimista
    setSavingId(id);
    startTransition(async () => {
      const result = await setOrderStatus(id, next);
      setSavingId(null);
      if (result.ok) {
        setSavedId(id);
        setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000);
      } else {
        setStatuses((s) => ({ ...s, [id]: prev! })); // revertir
        setError(result.error);
      }
    });
  }

  function handleProviderChange(id: string, nextProviderId: string) {
    const prev = providerIds[id] ?? "";
    setError(null);
    setProviderIds((p) => ({ ...p, [id]: nextProviderId })); // optimista
    setSavingProviderId(id);
    startTransition(async () => {
      const result = await setOrderProvider(
        id,
        nextProviderId === "" ? null : nextProviderId
      );
      setSavingProviderId(null);
      if (!result.ok) {
        setProviderIds((p) => ({ ...p, [id]: prev })); // revertir
        setError(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteOrder(id);
      setDeletingId(null);
      setConfirmDeleteId(null);
      if (!result.ok) setError(result.error);
    });
  }

  const dotFor = (status: string) =>
    STATUS_DOT[status as OrderStatus] ?? "bg-gray-400";

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
                Proveedor
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
            {safeOrders.map((order) => {
              const status = statuses[order.id] ?? order.status;
              return (
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
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${dotFor(status)}`}
                        aria-hidden="true"
                      />
                      <select
                        value={status}
                        onChange={(e) =>
                          handleStatusChange(
                            order.id,
                            e.target.value as OrderStatus
                          )
                        }
                        disabled={savingId === order.id}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      {savingId === order.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                      )}
                      {savedId === order.id && (
                        <Check className="h-3.5 w-3.5 text-brand" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={providerIds[order.id] ?? ""}
                        onChange={(e) =>
                          handleProviderChange(order.id, e.target.value)
                        }
                        disabled={
                          savingProviderId === order.id || providers.length === 0
                        }
                        className="max-w-[160px] rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                      >
                        <option value="">Sin asignar</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      {savingProviderId === order.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                      )}
                    </div>
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
                    {confirmDeleteId === order.id ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs text-muted">
                          ¿Eliminar definitivamente?
                        </span>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={deletingId === order.id}
                            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground hover:bg-surface"
                          >
                            Volver
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(order.id)}
                            disabled={deletingId === order.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-2.5 py-1.5 text-xs font-medium text-background hover:bg-danger/90 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            {deletingId === order.id
                              ? "Eliminando..."
                              : "Confirmar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(order.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {safeOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-muted">
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

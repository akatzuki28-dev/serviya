"use client";

import { useMemo, useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Banknote, Loader2, Check, RefreshCw } from "lucide-react";
import { setPayoutStatus, generatePayouts } from "./actions";

type PayoutStatus = "PENDIENTE" | "PAGADO";

export interface AdminPayout {
  id: string;
  grossAmount: string;
  platformFee: string;
  netAmount: string;
  status: string;
  createdAt: string;
  provider?: { id: string; name: string; phone: string | null } | null;
  order?: {
    id: string;
    serviceType: string;
    scheduledAt: string;
    status: string;
  } | null;
}

const STATUS_FILTERS: { value: "ALL" | PayoutStatus; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "PAGADO", label: "Pagadas" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  PAGADO: "bg-green-100 text-green-800",
};

export function PayoutsTable({ payouts }: { payouts: AdminPayout[] }) {
  const [filter, setFilter] = useState<"ALL" | PayoutStatus>("ALL");
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(payouts.map((p) => [p.id, p.status]))
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "ALL") return payouts;
    return payouts.filter((p) => (statuses[p.id] ?? p.status) === filter);
  }, [payouts, filter, statuses]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, p) => {
        acc.gross += Number(p.grossAmount);
        acc.fee += Number(p.platformFee);
        acc.net += Number(p.netAmount);
        return acc;
      },
      { gross: 0, fee: 0, net: 0 }
    );
  }, [filtered]);

  function handleMarkPaid(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await setPayoutStatus(id, "PAGADO");
      setBusyId(null);
      if (result.ok) {
        setStatuses((s) => ({ ...s, [id]: "PAGADO" }));
        setSavedId(id);
        setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRevert(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await setPayoutStatus(id, "PENDIENTE");
      setBusyId(null);
      if (result.ok) {
        setStatuses((s) => ({ ...s, [id]: "PENDIENTE" }));
      } else {
        setError(result.error);
      }
    });
  }

  function handleGenerate() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await generatePayouts();
      if (result.ok) {
        setInfo(
          result.generated > 0
            ? `Se generaron ${result.generated} liquidación${result.generated !== 1 ? "es" : ""}.`
            : "No hay órdenes completadas con proveedor pendientes de liquidar."
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-xl bg-brand-light px-4 py-2.5 text-sm text-brand">
          {info}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background p-3 shadow-[var(--shadow-soft)]">
        <div className="flex rounded-lg border border-border bg-background p-0.5">
          {STATUS_FILTERS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === opt.value
                  ? "bg-brand text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50"
        >
          {isPending && busyId === null ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Generar desde órdenes completadas
        </button>

        <span className="ml-auto text-xs text-subtle">
          {filtered.length} de {payouts.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background shadow-[var(--shadow-soft)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Proveedor", "Servicio", "Bruto", "Comisión", "Neto", "Estado", "Acción"].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-4 text-[11px] font-medium uppercase tracking-wider text-muted ${
                      i >= 2 && i <= 4 ? "text-right" : i === 6 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const status = statuses[p.id] ?? p.status;
              return (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-surface"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground">
                      {p.provider?.name ?? "—"}
                    </p>
                    {p.provider?.phone && (
                      <p className="text-xs text-muted">{p.provider.phone}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-medium text-foreground capitalize">
                      {p.order?.serviceType?.replace(/-/g, " ") ?? "—"}
                    </span>
                    {p.order?.scheduledAt && (
                      <p className="text-xs text-muted">
                        {formatDate(p.order.scheduledAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-muted">
                    {formatCurrency(Number(p.grossAmount))}
                  </td>
                  <td className="px-5 py-4 text-right text-muted">
                    {formatCurrency(Number(p.platformFee))}
                  </td>
                  <td className="px-5 py-4 text-right font-serif text-foreground">
                    {formatCurrency(Number(p.netAmount))}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {status === "PAGADO" ? "Pagada" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {status === "PENDIENTE" ? (
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(p.id)}
                        disabled={busyId === p.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-background transition-colors hover:bg-brand-soft disabled:opacity-50"
                      >
                        {busyId === p.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Marcar pagada
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {savedId === p.id && (
                          <Check className="h-3.5 w-3.5 text-brand" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRevert(p.id)}
                          disabled={busyId === p.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-50"
                        >
                          {busyId === p.id && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          Revertir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-muted">
                  <Banknote className="mx-auto mb-3 h-8 w-8 text-subtle" />
                  <p className="font-serif text-base">
                    No hay liquidaciones {filter !== "ALL" ? "con este filtro" : "todavía"}
                  </p>
                  <p className="mt-1 text-xs">
                    Generá liquidaciones a partir de las órdenes completadas con
                    proveedor asignado.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-surface/50 font-medium">
                <td className="px-5 py-3 text-xs uppercase tracking-wider text-muted" colSpan={2}>
                  Totales
                </td>
                <td className="px-5 py-3 text-right text-muted">
                  {formatCurrency(totals.gross)}
                </td>
                <td className="px-5 py-3 text-right text-muted">
                  {formatCurrency(totals.fee)}
                </td>
                <td className="px-5 py-3 text-right font-serif text-foreground">
                  {formatCurrency(totals.net)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

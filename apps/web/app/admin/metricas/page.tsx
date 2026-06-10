import type { Metadata } from "next";
import {
  BarChart3,
  Package,
  Users,
  DollarSign,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { STATUS_LABELS, STATUS_DOT, type OrderStatus } from "../ordenes/statuses";

export const metadata: Metadata = { title: "Métricas" };

interface Revenue {
  gross: string;
  fee: string;
  net: string;
}

interface Metrics {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  totalUsers: number;
  usersByRole: Record<string, number>;
  revenue: { allTime: Revenue; last30Days: Revenue };
  topServices: { serviceType: string; count: number; gross: string }[];
  topProviders: {
    providerId: string;
    name: string;
    count: number;
    net: string;
  }[];
}

const EMPTY: Metrics = {
  totalOrders: 0,
  ordersByStatus: {},
  totalUsers: 0,
  usersByRole: {},
  revenue: {
    allTime: { gross: "0", fee: "0", net: "0" },
    last30Days: { gross: "0", fee: "0", net: "0" },
  },
  topServices: [],
  topProviders: [],
};

async function getMetrics(): Promise<Metrics> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/metrics`,
      {
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    if (!res.ok) {
      console.error("[admin/metricas] respuesta inesperada del API:", res.status);
      return EMPTY;
    }
    return (await res.json()) as Metrics;
  } catch (err) {
    console.error("[admin/metricas] fetch falló:", err);
    return EMPTY;
  }
}

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Clientes",
  PROVIDER: "Proveedores",
  ADMIN: "Admins",
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 font-serif text-2xl text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export default async function AdminMetricasPage() {
  const m = await getMetrics();

  const statusEntries = Object.entries(m.ordersByStatus).sort(
    (a, b) => b[1] - a[1]
  );
  const maxStatus = Math.max(1, ...statusEntries.map(([, n]) => n));
  const maxService = Math.max(1, ...m.topServices.map((s) => s.count));

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">Métricas</h1>
          <p className="text-sm text-muted">Resumen general de la plataforma</p>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={Package}
          label="Órdenes"
          value={String(m.totalOrders)}
          hint="Total histórico"
        />
        <SummaryCard
          icon={Users}
          label="Usuarios"
          value={String(m.totalUsers)}
          hint={Object.entries(m.usersByRole)
            .map(([r, n]) => `${n} ${ROLE_LABELS[r] ?? r}`)
            .join(" · ")}
        />
        <SummaryCard
          icon={DollarSign}
          label="Ingreso bruto"
          value={formatCurrency(Number(m.revenue.allTime.gross))}
          hint="Total histórico"
        />
        <SummaryCard
          icon={Wallet}
          label="Comisión plataforma"
          value={formatCurrency(Number(m.revenue.allTime.fee))}
          hint={`Neto a proveedores: ${formatCurrency(Number(m.revenue.allTime.net))}`}
        />
      </div>

      {/* Ingresos últimos 30 días */}
      <div className="mt-4 rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center gap-2 text-muted">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Ingresos — últimos 30 días
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-subtle">Bruto</p>
            <p className="font-serif text-xl text-foreground">
              {formatCurrency(Number(m.revenue.last30Days.gross))}
            </p>
          </div>
          <div>
            <p className="text-xs text-subtle">Comisión</p>
            <p className="font-serif text-xl text-foreground">
              {formatCurrency(Number(m.revenue.last30Days.fee))}
            </p>
          </div>
          <div>
            <p className="text-xs text-subtle">Neto proveedores</p>
            <p className="font-serif text-xl text-foreground">
              {formatCurrency(Number(m.revenue.last30Days.net))}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Órdenes por estado */}
        <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 font-serif text-lg text-foreground">
            Órdenes por estado
          </h2>
          {statusEntries.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay órdenes.</p>
          ) : (
            <div className="space-y-3">
              {statusEntries.map(([status, n]) => (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-foreground">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          STATUS_DOT[status as OrderStatus] ?? "bg-gray-400"
                        }`}
                      />
                      {STATUS_LABELS[status as OrderStatus] ?? status}
                    </span>
                    <span className="font-medium text-muted">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(n / maxStatus) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top servicios */}
        <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 font-serif text-lg text-foreground">
            Top servicios
          </h2>
          {m.topServices.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay órdenes.</p>
          ) : (
            <div className="space-y-3">
              {m.topServices.map((s) => (
                <div key={s.serviceType}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="capitalize text-foreground">
                      {s.serviceType?.replace(/-/g, " ")}
                    </span>
                    <span className="font-medium text-muted">
                      {s.count} · {formatCurrency(Number(s.gross))}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{ width: `${(s.count / maxService) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top proveedores */}
      <div className="mt-4 rounded-2xl border border-border bg-background shadow-[var(--shadow-soft)]">
        <h2 className="px-5 pt-5 font-serif text-lg text-foreground">
          Top proveedores
        </h2>
        {m.topProviders.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            Todavía no hay órdenes con proveedor asignado.
          </p>
        ) : (
          <div className="overflow-x-auto p-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                    Proveedor
                  </th>
                  <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
                    Órdenes
                  </th>
                  <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
                    Neto acumulado
                  </th>
                </tr>
              </thead>
              <tbody>
                {m.topProviders.map((p) => (
                  <tr
                    key={p.providerId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-3 font-medium text-foreground">
                      {p.name}
                    </td>
                    <td className="px-3 py-3 text-right text-muted">{p.count}</td>
                    <td className="px-3 py-3 text-right font-serif text-foreground">
                      {formatCurrency(Number(p.net))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

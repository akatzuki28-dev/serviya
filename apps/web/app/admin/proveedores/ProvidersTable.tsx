"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Search, X } from "lucide-react";
import { toggleProviderActive } from "./actions";

export interface AdminProvider {
  id: string;
  name: string;
  phone: string | null;
  serviceCategories: string[];
  coverageZones: string[];
  isActive: boolean;
  createdAt: string;
}

type StatusFilter = "all" | "active" | "inactive";

export function ProvidersTable({
  providers,
  serviceOptions,
}: {
  providers: AdminProvider[];
  serviceOptions: { slug: string; name: string }[];
}) {
  const [rows, setRows] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(providers.map((p) => [p.id, p.isActive]))
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("");

  function handleToggle(id: string, next: boolean) {
    setPending((prev) => ({ ...prev, [id]: true }));
    startTransition(async () => {
      const result = await toggleProviderActive(id, next);
      setPending((prev) => ({ ...prev, [id]: false }));
      if (result.ok) {
        setRows((prev) => ({ ...prev, [id]: next }));
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      const active = rows[p.id] ?? p.isActive;

      if (status === "active" && !active) return false;
      if (status === "inactive" && active) return false;

      if (serviceFilter && !p.serviceCategories.includes(serviceFilter))
        return false;

      if (!q) return true;
      const haystack = [
        p.name.toLowerCase(),
        (p.phone ?? "").toLowerCase(),
        ...p.coverageZones.map((z) => z.toLowerCase()),
      ].join(" ");
      return haystack.includes(q);
    });
  }, [providers, rows, query, status, serviceFilter]);

  const hasFilters = query !== "" || status !== "all" || serviceFilter !== "";

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setServiceFilter("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background p-3 shadow-[var(--shadow-soft)]">
        <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
          <Search className="h-4 w-4 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono o zona..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
          />
        </div>

        <div className="flex rounded-lg border border-border bg-background p-0.5">
          {(
            [
              { value: "all", label: "Todos" },
              { value: "active", label: "Activos" },
              { value: "inactive", label: "Inactivos" },
            ] as { value: StatusFilter; label: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                status === opt.value
                  ? "bg-brand text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">Todos los servicios</option>
          {serviceOptions.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        )}

        <span className="ml-auto text-xs text-subtle">
          {filtered.length} de {providers.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-10 text-center shadow-[var(--shadow-soft)]">
          <p className="font-serif text-base text-foreground">
            Ningún proveedor coincide con los filtros.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-sm text-brand underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Nombre
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Teléfono
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Servicios
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Zonas
                </th>
                <th className="px-5 py-4 text-center text-[11px] font-medium uppercase tracking-wider text-muted">
                  Activo
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isActive = rows[p.id] ?? p.isActive;
                const isPending = pending[p.id] ?? false;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 align-top"
                  >
                    <td className="px-5 py-4">
                      <span className="font-medium text-foreground">{p.name}</span>
                      <p className="mt-1 font-mono text-[10px] text-subtle">
                        {p.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-muted">{p.phone || "—"}</td>
                    <td className="px-5 py-4">
                      {p.serviceCategories.length === 0 ? (
                        <span className="text-subtle">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.serviceCategories.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted capitalize"
                            >
                              {c.replace(/-/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {p.coverageZones.length === 0 ? (
                        <span className="text-subtle">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.coverageZones.map((z) => (
                            <span
                              key={z}
                              className="inline-flex items-center rounded-full bg-brand-light px-2 py-0.5 text-[11px] text-brand capitalize"
                            >
                              {z}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <label className="inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => handleToggle(p.id, e.target.checked)}
                          disabled={isPending}
                          className="h-4 w-4 rounded border-border accent-brand disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </label>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/proveedores/${p.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

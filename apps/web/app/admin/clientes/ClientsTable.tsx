"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import type { AdminClient, AdminRole } from "./actions";
import { RoleBadge } from "./RoleBadge";

type RoleFilter = "ALL" | AdminRole;

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "CLIENT", label: "Clientes" },
  { value: "PROVIDER", label: "Proveedores" },
  { value: "ADMIN", label: "Admins" },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ClientsTable({ clients }: { clients: AdminClient[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (roleFilter !== "ALL" && c.role !== roleFilter) return false;
      if (!q) return true;
      const haystack = [
        c.email.toLowerCase(),
        (c.name ?? "").toLowerCase(),
        (c.phone ?? "").toLowerCase(),
      ].join(" ");
      return haystack.includes(q);
    });
  }, [clients, query, roleFilter]);

  const hasFilters = query !== "" || roleFilter !== "ALL";

  function clearFilters() {
    setQuery("");
    setRoleFilter("ALL");
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
            placeholder="Buscar por email, nombre o teléfono..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
          />
        </div>

        <div className="flex rounded-lg border border-border bg-background p-0.5">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRoleFilter(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === opt.value
                  ? "bg-brand text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

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
          {filtered.length} de {clients.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-10 text-center shadow-[var(--shadow-soft)]">
          <p className="font-serif text-base text-foreground">
            Ningún usuario coincide con los filtros.
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
                  Usuario
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Teléfono
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Rol
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
                  Órdenes
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Registrado
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 align-top"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.image}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-medium text-muted">
                          {(c.name ?? c.email).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {c.name || c.email}
                        </p>
                        {c.name && (
                          <p className="truncate text-xs text-muted">{c.email}</p>
                        )}
                        <p className="mt-1 font-mono text-[10px] text-subtle">
                          {c.authProvider} · {c.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted">{c.phone || "—"}</td>
                  <td className="px-5 py-4">
                    <RoleBadge role={c.role} />
                  </td>
                  <td className="px-5 py-4 text-right font-serif text-foreground">
                    {c.ordersCount ?? 0}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
                    >
                      Ver detalle
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

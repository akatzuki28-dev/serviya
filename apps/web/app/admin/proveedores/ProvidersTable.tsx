"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
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

export function ProvidersTable({ providers }: { providers: AdminProvider[] }) {
  const [rows, setRows] = useState<Record<string, boolean>>(
    () => Object.fromEntries(providers.map((p) => [p.id, p.isActive]))
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

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

  return (
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
          {providers.map((p) => {
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
  );
}

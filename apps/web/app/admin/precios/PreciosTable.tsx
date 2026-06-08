"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateService } from "./actions";
import { Check, AlertCircle } from "lucide-react";

export interface AdminService {
  id: string;
  slug: string;
  basePrice: number;
  description: string;
  comingSoon: boolean;
}

interface RowState {
  basePrice: string;
  description: string;
  comingSoon: boolean;
  dirty: boolean;
  status: "idle" | "saving" | "saved" | "error";
  errorMsg?: string;
}

function initialRow(svc: AdminService): RowState {
  return {
    basePrice: String(svc.basePrice),
    description: svc.description,
    comingSoon: svc.comingSoon,
    dirty: false,
    status: "idle",
  };
}

export function PreciosTable({
  initialServices,
}: {
  initialServices: AdminService[];
}) {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(initialServices.map((s) => [s.slug, initialRow(s)]))
  );
  const [, startTransition] = useTransition();

  function patchRow(slug: string, patch: Partial<RowState>) {
    setRows((prev) => ({
      ...prev,
      [slug]: { ...prev[slug]!, ...patch, dirty: true, status: "idle" },
    }));
  }

  function handleSave(svc: AdminService) {
    const row = rows[svc.slug];
    if (!row) return;
    const parsedPrice = Number(row.basePrice);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setRows((prev) => ({
        ...prev,
        [svc.slug]: { ...row, status: "error", errorMsg: "Precio inválido" },
      }));
      return;
    }

    setRows((prev) => ({
      ...prev,
      [svc.slug]: { ...row, status: "saving", errorMsg: undefined },
    }));

    startTransition(async () => {
      const result = await updateService({
        slug: svc.slug,
        basePrice: parsedPrice,
        description: row.description.trim() === "" ? null : row.description.trim(),
        comingSoon: row.comingSoon,
      });

      setRows((prev) => {
        const current = prev[svc.slug]!;
        if (result.ok) {
          return {
            ...prev,
            [svc.slug]: { ...current, dirty: false, status: "saved" },
          };
        }
        return {
          ...prev,
          [svc.slug]: { ...current, status: "error", errorMsg: result.error },
        };
      });
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-background shadow-[var(--shadow-soft)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              Servicio
            </th>
            <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              Precio base (ARS)
            </th>
            <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              Descripción
            </th>
            <th className="px-5 py-4 text-center text-[11px] font-medium uppercase tracking-wider text-muted">
              Próximamente
            </th>
            <th className="px-5 py-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {initialServices.map((svc) => {
            const row = rows[svc.slug]!;
            return (
              <tr
                key={svc.slug}
                className="border-b border-border last:border-0 align-top"
              >
                <td className="px-5 py-4">
                  <span className="font-medium text-foreground capitalize">
                    {svc.slug.replace(/-/g, " ")}
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-subtle">{svc.slug}</p>
                </td>
                <td className="px-5 py-4 w-40">
                  <Input
                    id={`price-${svc.slug}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={100}
                    value={row.basePrice}
                    onChange={(e) =>
                      patchRow(svc.slug, { basePrice: e.target.value })
                    }
                  />
                </td>
                <td className="px-5 py-4">
                  <Input
                    id={`desc-${svc.slug}`}
                    type="text"
                    value={row.description}
                    onChange={(e) =>
                      patchRow(svc.slug, { description: e.target.value })
                    }
                    placeholder="Descripción corta del servicio"
                  />
                </td>
                <td className="px-5 py-4 text-center">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.comingSoon}
                      onChange={(e) =>
                        patchRow(svc.slug, { comingSoon: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-border accent-brand"
                    />
                  </label>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {row.status === "saved" && !row.dirty && (
                      <span className="inline-flex items-center gap-1 text-xs text-brand">
                        <Check className="h-3.5 w-3.5" />
                        Guardado
                      </span>
                    )}
                    {row.status === "error" && (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-danger"
                        title={row.errorMsg}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        Error
                      </span>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleSave(svc)}
                      disabled={!row.dirty || row.status === "saving"}
                      loading={row.status === "saving"}
                    >
                      Guardar
                    </Button>
                  </div>
                  {row.status === "error" && row.errorMsg && (
                    <p className="mt-1 text-[11px] text-danger">{row.errorMsg}</p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createProvider,
  updateProvider,
  deleteProvider,
  type ProviderInput,
  type AdminUserLite,
} from "./actions";
import { UserCombobox } from "./UserCombobox";

export interface ServiceOption {
  slug: string;
  name: string;
}

interface ProviderFormProps {
  services: ServiceOption[];
  initial?: {
    id: string;
    name: string;
    phone: string | null;
    serviceCategories: string[];
    coverageZones: string[];
    isActive: boolean;
    userId: string | null;
    linkedUser: AdminUserLite | null;
  };
}

export function ProviderForm({ services, initial }: ProviderFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [categories, setCategories] = useState<string[]>(
    initial?.serviceCategories ?? []
  );
  const [zones, setZones] = useState<string[]>(initial?.coverageZones ?? []);
  const [zoneDraft, setZoneDraft] = useState("");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [userId, setUserId] = useState<string | null>(initial?.userId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function toggleCategory(slug: string) {
    setCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function addZoneFromDraft() {
    const trimmed = zoneDraft.trim().toLowerCase();
    if (!trimmed) return;
    if (zones.includes(trimmed)) {
      setZoneDraft("");
      return;
    }
    setZones((prev) => [...prev, trimmed]);
    setZoneDraft("");
  }

  function removeZone(z: string) {
    setZones((prev) => prev.filter((x) => x !== z));
  }

  function handleZoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addZoneFromDraft();
    } else if (e.key === "Backspace" && zoneDraft === "" && zones.length > 0) {
      setZones((prev) => prev.slice(0, -1));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    // Add any pending zone in the input
    const finalZones = [...zones];
    const pending = zoneDraft.trim().toLowerCase();
    if (pending && !finalZones.includes(pending)) finalZones.push(pending);

    const payload: ProviderInput = {
      name: name.trim(),
      phone: phone.trim() === "" ? null : phone.trim(),
      serviceCategories: categories,
      coverageZones: finalZones,
      isActive,
      userId,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateProvider(initial!.id, payload)
        : await createProvider(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/proveedores");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-border bg-background p-6 shadow-[var(--shadow-soft)]"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="name"
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Juan Pérez"
        />
        <Input
          id="phone"
          label="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+54 11 ..."
        />
      </div>

      <div>
        <label className="mb-2 block text-[11px] uppercase tracking-wider font-medium text-muted">
          Servicios que cubre
        </label>
        {services.length === 0 ? (
          <p className="text-sm text-muted">
            No hay servicios cargados. Andá a{" "}
            <a href="/admin/precios" className="text-brand underline">
              /admin/precios
            </a>{" "}
            primero.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {services.map((svc) => {
              const checked = categories.includes(svc.slug);
              return (
                <label
                  key={svc.slug}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    checked
                      ? "border-brand bg-brand-light text-foreground"
                      : "border-border bg-background text-muted hover:border-brand/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(svc.slug)}
                    className="h-4 w-4 rounded border-border accent-brand"
                  />
                  <span className="capitalize">{svc.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="zone-input"
          className="mb-2 block text-[11px] uppercase tracking-wider font-medium text-muted"
        >
          Zonas de cobertura
        </label>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
          {zones.map((z) => (
            <span
              key={z}
              className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-xs text-brand capitalize"
            >
              {z}
              <button
                type="button"
                onClick={() => removeZone(z)}
                className="rounded-full hover:bg-brand/20"
                aria-label={`Quitar ${z}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id="zone-input"
            type="text"
            value={zoneDraft}
            onChange={(e) => setZoneDraft(e.target.value)}
            onKeyDown={handleZoneKeyDown}
            onBlur={addZoneFromDraft}
            placeholder={
              zones.length === 0
                ? "palermo, belgrano, recoleta..."
                : "agregar otra..."
            }
            className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-subtle">
          Enter o coma para agregar. Backspace para borrar la última.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-[11px] uppercase tracking-wider font-medium text-muted">
          Usuario vinculado (opcional)
        </label>
        <UserCombobox
          value={userId}
          initialUser={initial?.linkedUser ?? null}
          onChange={setUserId}
        />
        <p className="mt-1.5 text-[11px] text-subtle">
          Si el proveedor tiene cuenta en la plataforma, vinculalo para que pueda
          acceder a su propio panel.
        </p>
      </div>

      <div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-brand"
          />
          <span className="text-sm text-foreground">Activo</span>
        </label>
        <p className="mt-1 text-[11px] text-subtle">
          Si está inactivo no aparece en asignaciones automáticas ni en búsquedas
          públicas.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {isEdit ? (
          <div className="flex flex-col items-start gap-2">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isPending || isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar proveedor
              </button>
            ) : (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="text-xs text-danger">
                  ¿Eliminar definitivamente? Esto no se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-surface"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setError(null);
                      startDeleteTransition(async () => {
                        const result = await deleteProvider(initial!.id);
                        if (result.ok) {
                          router.push("/admin/proveedores");
                          router.refresh();
                        } else {
                          setError(
                            result.error +
                              (result.conflict
                                ? ` (órdenes: ${result.conflict.orders}, payouts: ${result.conflict.payouts})`
                                : "")
                          );
                          setConfirmDelete(false);
                        }
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-background hover:bg-danger/90 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/proveedores")}
            disabled={isPending || isDeleting}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={isPending} disabled={isDeleting}>
            {isEdit ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </div>
      </div>
    </form>
  );
}

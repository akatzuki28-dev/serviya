"use client";

import { useState, useTransition } from "react";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type AddressInput,
} from "./actions";

export interface Address {
  id: string;
  label: string | null;
  street: string;
  city: string;
  isDefault: boolean;
}

type FormState = AddressInput & { id?: string };

const EMPTY_FORM: FormState = {
  label: "",
  street: "",
  city: "",
  isDefault: false,
};

export function AddressesManager({ addresses }: { addresses: Address[] }) {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setError(null);
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(a: Address) {
    setError(null);
    setForm({
      id: a.id,
      label: a.label ?? "",
      street: a.street,
      city: a.city,
      isDefault: a.isDefault,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);

    const payload: AddressInput = {
      label: form.label?.trim() ? form.label.trim() : null,
      street: form.street.trim(),
      city: form.city.trim(),
      isDefault: form.isDefault,
    };

    if (!payload.street || !payload.city) {
      setError("La calle y la ciudad son obligatorias.");
      return;
    }

    startTransition(async () => {
      const result = form.id
        ? await updateAddress(form.id, payload)
        : await addAddress(payload);
      if (result.ok) {
        setForm(null);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await deleteAddress(id);
      setBusyId(null);
      setConfirmDeleteId(null);
      if (!result.ok) setError(result.error);
    });
  }

  function handleSetDefault(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await setDefaultAddress(id);
      setBusyId(null);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {addresses.length === 0 && !form ? (
        <div className="rounded-2xl border border-border bg-background p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
            <MapPin className="h-6 w-6 text-muted" />
          </div>
          <p className="font-serif text-lg text-foreground">
            Todavía no guardaste direcciones
          </p>
          <p className="mt-1 text-sm text-muted">
            Agregá una dirección para reservar más rápido la próxima vez.
          </p>
          <Button className="mt-6" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Agregar dirección
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {addresses.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-serif text-base text-foreground">
                        {a.label || a.street}
                      </p>
                      {a.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold-soft">
                          <Star className="h-3 w-3 fill-current" />
                          Predeterminada
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {a.street}, {a.city}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!a.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(a.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      {busyId === a.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Star className="h-3 w-3" />
                      )}
                      Predeterminar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                  {confirmDeleteId === a.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={busyId === a.id}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground hover:bg-surface"
                      >
                        Volver
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        disabled={busyId === a.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-2.5 py-1.5 text-xs font-medium text-background hover:bg-danger/90 disabled:opacity-50"
                      >
                        {busyId === a.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Confirmar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(a.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!form && (
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Agregar dirección
            </Button>
          )}
        </>
      )}

      {form && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-background p-6 shadow-[var(--shadow-soft)]"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-foreground">
              {form.id ? "Editar dirección" : "Nueva dirección"}
            </h2>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Etiqueta (opcional)
            </label>
            <input
              type="text"
              value={form.label ?? ""}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Casa, Trabajo, etc."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Calle y número
            </label>
            <input
              type="text"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder="Av. Siempreviva 742"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Ciudad / localidad
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Buenos Aires"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isDefault ?? false}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
            />
            Marcar como predeterminada
          </label>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={isPending}>
              <Check className="h-4 w-4" />
              {form.id ? "Guardar cambios" : "Agregar dirección"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setForm(null)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

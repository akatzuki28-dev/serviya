"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateUser, type AdminRole } from "../actions";

const ROLES: { value: AdminRole; label: string; description: string }[] = [
  {
    value: "CLIENT",
    label: "Cliente",
    description: "Puede reservar servicios y ver sus órdenes.",
  },
  {
    value: "PROVIDER",
    label: "Proveedor",
    description: "Accede al panel de proveedor y recibe asignaciones.",
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Acceso completo al dashboard de gestión.",
  },
];

export function RoleSelector({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: AdminRole;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminRole>(currentRole);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const dirty = selected !== currentRole;
  // Si es vos mismo y querés bajarte de ADMIN, bloqueamos en cliente (la action también lo valida).
  const wouldDemoteSelf = isSelf && currentRole === "ADMIN" && selected !== "ADMIN";

  function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    startTransition(async () => {
      const result = await updateUser(userId, { role: selected });
      if (result.ok) {
        setStatus("saved");
        router.refresh();
      } else {
        setStatus("error");
        setErrorMsg(result.error);
        setSelected(currentRole);
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        {isSelf
          ? "Cuidado: estás editando tu propio usuario."
          : "El cambio se aplica al instante y requiere que el usuario vuelva a iniciar sesión para refrescar su sesión."}
      </p>
      <div className="space-y-2">
        {ROLES.map((r) => {
          const checked = selected === r.value;
          return (
            <label
              key={r.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
                checked
                  ? "border-brand bg-brand-light"
                  : "border-border bg-background hover:border-brand/40"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={checked}
                onChange={() => setSelected(r.value)}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <div>
                <p className="font-medium text-foreground">{r.label}</p>
                <p className="text-xs text-muted">{r.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      {wouldDemoteSelf && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
          No podés quitarte tu propio rol ADMIN.
        </p>
      )}
      {errorMsg && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
          <AlertCircle className="mr-1 inline h-3 w-3" />
          {errorMsg}
        </p>
      )}
      {status === "saved" && !dirty && (
        <p className="rounded-xl bg-brand-light px-3 py-2 text-xs text-brand">
          <Check className="mr-1 inline h-3 w-3" />
          Rol actualizado.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!dirty || wouldDemoteSelf || status === "saving"}
          loading={status === "saving"}
        >
          Guardar cambio
        </Button>
      </div>
    </div>
  );
}

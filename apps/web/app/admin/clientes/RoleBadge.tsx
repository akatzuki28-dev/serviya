import type { AdminRole } from "./actions";

const ROLE_STYLES: Record<AdminRole, string> = {
  CLIENT: "bg-surface text-muted",
  PROVIDER: "bg-brand-light text-brand",
  ADMIN: "bg-foreground text-background",
};

const ROLE_LABELS: Record<AdminRole, string> = {
  CLIENT: "Cliente",
  PROVIDER: "Proveedor",
  ADMIN: "Admin",
};

export function RoleBadge({ role }: { role: AdminRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${ROLE_STYLES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

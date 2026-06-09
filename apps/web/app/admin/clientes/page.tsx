import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ClientsTable } from "./ClientsTable";
import type { AdminClient } from "./actions";

export const metadata: Metadata = { title: "Clientes" };

async function getClients(): Promise<AdminClient[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?withCounts=1&limit=500`,
      {
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function AdminClientesPage() {
  const clients = await getClients();

  const byRole = {
    CLIENT: clients.filter((c) => c.role === "CLIENT").length,
    PROVIDER: clients.filter((c) => c.role === "PROVIDER").length,
    ADMIN: clients.filter((c) => c.role === "ADMIN").length,
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">Clientes</h1>
          <p className="text-sm text-muted">
            {clients.length} usuario{clients.length !== 1 && "s"} ·{" "}
            {byRole.CLIENT} clientes · {byRole.PROVIDER} proveedores ·{" "}
            {byRole.ADMIN} admins
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-10 text-center shadow-[var(--shadow-soft)]">
          <Users className="mx-auto mb-3 h-8 w-8 text-subtle" />
          <p className="font-serif text-base text-foreground">
            Todavía no hay usuarios registrados
          </p>
          <p className="mt-1 text-sm text-muted">
            Aparecerán acá cuando se logueen por primera vez.
          </p>
        </div>
      ) : (
        <ClientsTable clients={clients} />
      )}
    </div>
  );
}

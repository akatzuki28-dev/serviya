import type { Metadata } from "next";
import { DollarSign } from "lucide-react";
import { PreciosTable, type AdminService } from "./PreciosTable";

export const metadata: Metadata = { title: "Precios" };

async function getServices(): Promise<AdminService[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services`,
      {
        cache: "no-store",
        headers: {
          "x-admin-secret": process.env.ADMIN_SECRET ?? "",
        },
      }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function AdminPreciosPage() {
  const services = await getServices();

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">Precios</h1>
          <p className="text-sm text-muted">
            Editá el precio base, la descripción y el flag de &ldquo;Próximamente&rdquo;
            de cada servicio.
          </p>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-10 text-center shadow-[var(--shadow-soft)]">
          <p className="font-serif text-base text-foreground">
            No hay servicios en la base de datos.
          </p>
          <p className="mt-2 text-sm text-muted">
            Insertá filas en <code>service_pricing</code> con <code>zone = NULL</code>{" "}
            para que aparezcan acá.
          </p>
        </div>
      ) : (
        <PreciosTable initialServices={services} />
      )}
    </div>
  );
}

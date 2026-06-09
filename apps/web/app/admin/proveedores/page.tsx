import type { Metadata } from "next";
import Link from "next/link";
import { UserCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProvidersTable, type AdminProvider } from "./ProvidersTable";

export const metadata: Metadata = { title: "Proveedores" };

async function getProviders(): Promise<AdminProvider[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/providers`,
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

async function getServices(): Promise<{ slug: string; name: string }[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/services`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ slug: string; name: string }>;
    return data.map((s) => ({ slug: s.slug, name: s.name }));
  } catch {
    return [];
  }
}

export default async function AdminProveedoresPage() {
  const [providers, services] = await Promise.all([
    getProviders(),
    getServices(),
  ]);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-foreground">Proveedores</h1>
            <p className="text-sm text-muted">
              {providers.length} proveedor{providers.length !== 1 && "es"} cargados —{" "}
              {providers.filter((p) => p.isActive).length} activos
            </p>
          </div>
        </div>
        <Link href="/admin/proveedores/nuevo">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </Button>
        </Link>
      </div>

      {providers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-10 text-center shadow-[var(--shadow-soft)]">
          <UserCheck className="mx-auto mb-3 h-8 w-8 text-subtle" />
          <p className="font-serif text-base text-foreground">
            Todavía no hay proveedores cargados
          </p>
          <p className="mt-1 text-sm text-muted">
            Creá el primero desde el botón &ldquo;Nuevo proveedor&rdquo;.
          </p>
        </div>
      ) : (
        <ProvidersTable providers={providers} serviceOptions={services} />
      )}
    </div>
  );
}

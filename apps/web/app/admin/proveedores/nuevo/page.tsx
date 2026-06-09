import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, UserCheck } from "lucide-react";
import { ProviderForm, type ServiceOption } from "../ProviderForm";

export const metadata: Metadata = { title: "Nuevo proveedor" };

async function getServices(): Promise<ServiceOption[]> {
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

export default async function NuevoProveedorPage() {
  const services = await getServices();

  return (
    <div>
      <Link
        href="/admin/proveedores"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al listado
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <UserCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">Nuevo proveedor</h1>
          <p className="text-sm text-muted">
            Completá los datos y guardá. Se crea como activo por defecto.
          </p>
        </div>
      </div>

      <ProviderForm services={services} />
    </div>
  );
}

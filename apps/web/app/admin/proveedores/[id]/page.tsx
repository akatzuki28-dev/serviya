import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserCheck } from "lucide-react";
import { ProviderForm, type ServiceOption } from "../ProviderForm";
import type { AdminUserLite } from "../actions";

export const metadata: Metadata = { title: "Editar proveedor" };

interface AdminProvider {
  id: string;
  name: string;
  phone: string | null;
  serviceCategories: string[];
  coverageZones: string[];
  isActive: boolean;
  userId: string | null;
}

async function getLinkedUser(userId: string): Promise<AdminUserLite | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?q=${encodeURIComponent(userId)}&limit=200`,
      {
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    if (!res.ok) return null;
    // The search endpoint filters by email/phone, so it won't match by id.
    // Fall back: fetch the broader list and find by id (small dataset for now).
    const broader = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?limit=200`,
      {
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    if (!broader.ok) return null;
    const list = (await broader.json()) as AdminUserLite[];
    return list.find((u) => u.id === userId) ?? null;
  } catch {
    return null;
  }
}

async function getProvider(id: string): Promise<AdminProvider | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/providers/${encodeURIComponent(id)}`,
      {
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [provider, services] = await Promise.all([
    getProvider(id),
    getServices(),
  ]);

  if (!provider) notFound();

  const linkedUser = provider.userId ? await getLinkedUser(provider.userId) : null;

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
          <h1 className="font-serif text-2xl text-foreground">{provider.name}</h1>
          <p className="text-sm text-muted">
            Editando proveedor &middot; <span className="font-mono text-xs">{id.slice(0, 8)}</span>
          </p>
        </div>
      </div>

      <ProviderForm
        services={services}
        initial={{
          id,
          name: provider.name,
          phone: provider.phone,
          serviceCategories: provider.serviceCategories ?? [],
          coverageZones: provider.coverageZones ?? [],
          isActive: provider.isActive,
          userId: provider.userId,
          linkedUser,
        }}
      />
    </div>
  );
}

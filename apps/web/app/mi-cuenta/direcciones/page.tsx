import type { Metadata } from "next";
import { auth } from "@/auth";
import { AddressesManager, type Address } from "./AddressesManager";

export const metadata: Metadata = { title: "Mis direcciones" };

async function getUserAddresses(userId: string): Promise<Address[]> {
  try {
    // El server component ya autenticó la sesión y el userId es el del
    // usuario logueado, así que confiamos vía admin-secret (server-to-server).
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/addresses`,
      {
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function MisDireccionesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const addresses = userId ? await getUserAddresses(userId) : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-foreground">Mis direcciones</h1>
        <p className="mt-1 text-sm text-muted">
          Guardá tus direcciones para reservar más rápido
        </p>
      </div>

      <AddressesManager addresses={addresses} />
    </div>
  );
}

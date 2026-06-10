import type { Metadata } from "next";
import { Package } from "lucide-react";
import { OrdersTable, type ProviderOption } from "./OrdersTable";

export const metadata: Metadata = { title: "Órdenes" };

async function getOrders() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders`,
      {
        cache: "no-store",
        headers: {
          "x-admin-secret": process.env.ADMIN_SECRET ?? "",
        },
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data)) {
      console.error(
        "[admin/ordenes] respuesta inesperada del API:",
        res.status,
        JSON.stringify(data)?.slice(0, 300)
      );
      return [];
    }
    return data;
  } catch (err) {
    console.error("[admin/ordenes] fetch falló:", err);
    return [];
  }
}

async function getProviders(): Promise<ProviderOption[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/providers`,
      {
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    // Solo activos, ordenados por nombre para el selector.
    return data
      .filter((p: { isActive?: boolean }) => p.isActive !== false)
      .map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
      .sort((a: ProviderOption, b: ProviderOption) =>
        a.name.localeCompare(b.name, "es")
      );
  } catch (err) {
    console.error("[admin/ordenes] fetch proveedores falló:", err);
    return [];
  }
}

export default async function AdminOrdenesPage() {
  const [orders, providers] = await Promise.all([getOrders(), getProviders()]);

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">Órdenes</h1>
          <p className="text-sm text-muted">
            {orders.length} orden{orders.length !== 1 && "es"} en total
          </p>
        </div>
      </div>

      <OrdersTable orders={orders} providers={providers} />
    </div>
  );
}

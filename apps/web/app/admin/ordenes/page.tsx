import type { Metadata } from "next";
import { Package } from "lucide-react";
import { OrdersTable } from "./OrdersTable";

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
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function AdminOrdenesPage() {
  const orders = await getOrders();

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

      <OrdersTable orders={orders} />
    </div>
  );
}

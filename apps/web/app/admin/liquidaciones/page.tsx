import type { Metadata } from "next";
import { Banknote } from "lucide-react";
import { PayoutsTable, type AdminPayout } from "./PayoutsTable";

export const metadata: Metadata = { title: "Liquidaciones" };

async function getPayouts(): Promise<AdminPayout[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/payouts`,
      {
        cache: "no-store",
        headers: { "x-admin-secret": process.env.ADMIN_SECRET ?? "" },
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data)) {
      console.error(
        "[admin/liquidaciones] respuesta inesperada del API:",
        res.status,
        JSON.stringify(data)?.slice(0, 300)
      );
      return [];
    }
    return data;
  } catch (err) {
    console.error("[admin/liquidaciones] fetch falló:", err);
    return [];
  }
}

export default async function AdminLiquidacionesPage() {
  const payouts = await getPayouts();
  const pendientes = payouts.filter((p) => p.status === "PENDIENTE").length;

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Banknote className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">Liquidaciones</h1>
          <p className="text-sm text-muted">
            {payouts.length} liquidación{payouts.length !== 1 && "es"} —{" "}
            {pendientes} pendiente{pendientes !== 1 && "s"}
          </p>
        </div>
      </div>

      <PayoutsTable payouts={payouts} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Mail, Phone, Calendar, Package } from "lucide-react";
import { auth } from "@/auth";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RoleBadge } from "../RoleBadge";
import { RoleSelector } from "./RoleSelector";
import type { AdminRole } from "../actions";

export const metadata: Metadata = { title: "Detalle de usuario" };

interface UserDetail {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  image: string | null;
  role: AdminRole;
  authProvider: string;
  createdAt: string;
  updatedAt: string;
  ordersCount: number;
}

interface UserOrder {
  id: string;
  serviceType: string;
  scheduledAt: string;
  status: string;
  grossAmount: string;
  paymentMethod: string;
  createdAt: string;
}

async function getUser(id: string): Promise<UserDetail | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${encodeURIComponent(id)}`,
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

async function getOrders(id: string): Promise<UserOrder[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${encodeURIComponent(id)}/orders`,
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

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, orders, session] = await Promise.all([
    getUser(id),
    getOrders(id),
    auth(),
  ]);

  if (!user) notFound();

  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const isSelf = currentUserId === id;

  return (
    <div>
      <Link
        href="/admin/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al listado
      </Link>

      <div className="mb-8 flex items-start gap-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-lg font-medium text-brand">
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl text-foreground">
              {user.name || user.email}
            </h1>
            <RoleBadge role={user.role} />
            {isSelf && (
              <span className="inline-flex items-center rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-brand">
                Vos
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            <span className="font-mono text-xs">{id}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-border bg-background p-6 shadow-[var(--shadow-soft)]">
            <h2 className="mb-4 text-[11px] uppercase tracking-wider font-medium text-muted">
              Información
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-wider text-subtle">
                    Email
                  </dt>
                  <dd className="truncate text-foreground">{user.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-subtle">
                    Teléfono
                  </dt>
                  <dd className="text-foreground">{user.phone || "—"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-subtle">
                    Registrado
                  </dt>
                  <dd className="text-foreground">
                    {new Date(user.createdAt).toLocaleString("es-AR")}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-subtle">
                    Órdenes totales
                  </dt>
                  <dd className="font-serif text-foreground">
                    {user.ordersCount}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-subtle">
                    Auth provider
                  </dt>
                  <dd className="text-foreground capitalize">
                    {user.authProvider}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6 shadow-[var(--shadow-soft)]">
            <h2 className="mb-2 text-[11px] uppercase tracking-wider font-medium text-muted">
              Cambiar rol
            </h2>
            <RoleSelector
              userId={user.id}
              currentRole={user.role}
              isSelf={isSelf}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-[var(--shadow-soft)]">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-serif text-base text-foreground">Órdenes</h2>
              <p className="text-xs text-muted">
                Últimas {orders.length} órdenes de este usuario
              </p>
            </div>
            {orders.length === 0 ? (
              <div className="px-5 py-16 text-center text-muted">
                <Package className="mx-auto mb-3 h-8 w-8 text-subtle" />
                <p className="font-serif text-base">Sin órdenes todavía</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/40">
                    <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                      ID
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                      Servicio
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                      Fecha
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                      Estado
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-subtle">
                        {o.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3 capitalize text-foreground">
                        {o.serviceType.replace(/-/g, " ")}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {formatDate(o.scheduledAt)}
                      </td>
                      <td className="px-5 py-3">
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-serif text-foreground">
                        {formatCurrency(Number(o.grossAmount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

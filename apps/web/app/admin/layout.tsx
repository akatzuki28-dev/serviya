import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  Package,
  Banknote,
  Users,
  UserCheck,
  DollarSign,
  BarChart3,
  Shield,
} from "lucide-react";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin — ServiYa" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin/ordenes", label: "Órdenes", icon: Package },
  { href: "/admin/liquidaciones", label: "Liquidaciones", icon: Banknote },
  { href: "/admin/proveedores", label: "Proveedores", icon: UserCheck },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/precios", label: "Precios", icon: DollarSign },
  { href: "/admin/metricas", label: "Métricas", icon: BarChart3 },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session || role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className="border-b border-border bg-brand">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/15">
                <Shield className="h-4 w-4 text-background" />
              </div>
              <Link
                href="/admin"
                className="font-serif text-lg tracking-tight text-background"
              >
                ServiYa<span className="text-gold">.</span>{" "}
                <span className="text-background/60 font-sans text-sm font-normal">
                  Admin
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-background/60">
                {session.user?.email}
              </span>
              <Link
                href="/"
                className="text-xs text-background/40 hover:text-background transition-colors"
              >
                Ver sitio
              </Link>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto pb-0 -mb-px">
            {NAV.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-background/60 transition-colors hover:border-background/30 hover:text-background"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

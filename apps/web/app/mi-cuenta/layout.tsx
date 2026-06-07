import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Package, MapPin, Star, LogOut, User } from "lucide-react";

export const metadata: Metadata = {
  title: { default: "Mi cuenta", template: "%s | Mi cuenta — ServiYa" },
  robots: { index: false, follow: false },
};

const SIDEBAR_LINKS = [
  { href: "/mi-cuenta/ordenes", label: "Mis órdenes", icon: Package },
  { href: "/mi-cuenta/direcciones", label: "Mis direcciones", icon: MapPin },
  { href: "/mi-cuenta/resenas", label: "Mis reseñas", icon: Star },
];

export default async function MiCuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login?callbackUrl=/mi-cuenta");

  return (
    <>
      <Navbar />
      <div className="flex flex-1 flex-col pt-16 sm:pt-20">
        <div className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-background">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-serif text-lg text-foreground">
                  {session.user?.name ?? "Mi cuenta"}
                </p>
                <p className="text-xs text-muted">{session.user?.email}</p>
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </Button>
            </form>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-1 px-5 sm:px-8">
          <aside className="hidden w-56 shrink-0 border-r border-border py-8 pr-6 sm:block">
            <nav className="space-y-1">
              {SIDEBAR_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Mobile nav */}
          <div className="sm:hidden border-b border-border w-full">
            <nav className="flex gap-1 overflow-x-auto py-3 -mx-1">
              {SIDEBAR_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-brand hover:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <main className="flex-1 py-8 sm:pl-8">{children}</main>
        </div>
      </div>
    </>
  );
}

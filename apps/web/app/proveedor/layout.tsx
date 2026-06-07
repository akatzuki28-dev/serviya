import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Briefcase, LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: {
    default: "Panel Proveedor",
    template: "%s | Proveedor — ServiYa",
  },
  robots: { index: false, follow: false },
};

export default async function ProveedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session || (role !== "PROVIDER" && role !== "ADMIN")) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 sm:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-background">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="font-serif text-lg text-foreground">
                Hola, {session.user?.name ?? session.user?.email}
              </p>
              <p className="text-xs text-muted">Panel de proveedor</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Ver sitio
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = {
  title: "Iniciar sesión",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-col items-center justify-center px-5 pt-20">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="font-serif text-3xl tracking-tight text-foreground"
            >
              ServiYa<span className="text-gold">.</span>
            </Link>
            <h1 className="mt-4 font-serif text-2xl text-foreground">
              Iniciá sesión
            </h1>
            <p className="mt-1 text-sm text-muted">
              Accedé a tu cuenta para gestionar tus reservas
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-8 shadow-[var(--shadow-card)]">
            <Suspense
              fallback={<div className="skeleton h-64 rounded-xl" />}
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

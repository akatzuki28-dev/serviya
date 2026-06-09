"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Menu, X, User } from "lucide-react";

const NAV_LINKS = [
  { href: "/servicios/limpieza-de-hogar", label: "Servicios" },
  { href: "/#precios", label: "Precios" },
  { href: "/#proceso", label: "Cómo funciona" },
  { href: "/#opiniones", label: "Opiniones" },
];

export function NavbarClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/85 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8 h-16 sm:h-20">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-serif text-xl sm:text-2xl tracking-tight text-foreground"
          aria-label="ServiYa - Inicio"
        >
          ServiYa
          <span className="text-gold">.</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-foreground link-underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/mi-cuenta/ordenes">
                <User className="h-4 w-4" />
                Mi cuenta
              </Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Ingresar</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/reservar">Reservar</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground cursor-pointer"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <div className="px-5 py-6 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-base text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-2">
              {isLoggedIn ? (
                <Button asChild variant="outline" size="md" className="flex-1">
                  <Link href="/mi-cuenta/ordenes" onClick={() => setOpen(false)}>
                    <User className="h-4 w-4" />
                    Mi cuenta
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="md" className="flex-1">
                  <Link href="/auth/login" onClick={() => setOpen(false)}>
                    Ingresar
                  </Link>
                </Button>
              )}
              <Button asChild size="md" className="flex-1">
                <Link href="/reservar" onClick={() => setOpen(false)}>
                  Reservar
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

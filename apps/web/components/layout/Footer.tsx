import Link from "next/link";
import { Container } from "@/components/ui/Container";

const FOOTER_LINKS = [
  {
    title: "Servicios",
    links: [
      { href: "/servicios/limpieza-de-hogar", label: "Limpieza de hogar" },
      { href: "/servicios/limpieza-de-hogar/palermo", label: "Palermo" },
      { href: "/servicios/limpieza-de-hogar/belgrano", label: "Belgrano" },
      { href: "/servicios/limpieza-de-hogar/recoleta", label: "Recoleta" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/#proceso", label: "Cómo funciona" },
      { href: "/#opiniones", label: "Opiniones" },
      { href: "/#faq", label: "Preguntas frecuentes" },
      { href: "/auth/login", label: "Soy proveedor" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terminos", label: "Términos" },
      { href: "/privacidad", label: "Privacidad" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="py-16 sm:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          {/* Wordmark column */}
          <div className="col-span-2">
            <Link
              href="/"
              className="font-serif text-2xl tracking-tight text-foreground"
            >
              ServiYa<span className="text-gold">.</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Limpieza profesional a domicilio en Capital Federal.
              Profesionales verificados, productos premium, resultados impecables.
            </p>
            <div className="mt-6 flex items-center gap-3 text-xs text-subtle">
              <span>Disponible de Lun a Sáb</span>
              <span aria-hidden="true">·</span>
              <span>8 a 19 hs</span>
            </div>
          </div>

          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground">
                {col.title}
              </p>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-8 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ServiYa. Hecho en Buenos Aires.</p>
          <p>
            Atención al cliente:{" "}
            <a
              href="https://wa.me/5491100000000"
              className="text-foreground link-underline"
            >
              WhatsApp +54 9 11 0000-0000
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}

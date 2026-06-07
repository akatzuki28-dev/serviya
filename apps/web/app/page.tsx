import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Container, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, Check, Quote, Star, ShieldCheck, Sparkles, Clock4 } from "lucide-react";

export const metadata: Metadata = {
  title: "Limpieza profesional a domicilio en CABA",
  description:
    "ServiYa: servicio de limpieza premium a domicilio en Capital Federal. Profesionales verificados, productos hipoalergénicos y resultados impecables. Reservá en 3 minutos.",
};

/* ── Stock images (Unsplash, optimizadas vía next/image) ─────────────────── */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1600&q=80";
const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80";

/* ── Data ──────────────────────────────────────────────────────────────── */
const TIERS = [
  {
    name: "Express",
    badge: "Para mantenimiento semanal",
    description:
      "Limpieza superficial de áreas principales. Ideal para hogares ya ordenados.",
    pricing: [
      { rooms: "1 ambiente", price: 8500 },
      { rooms: "2 ambientes", price: 12500 },
      { rooms: "3+ ambientes", price: 17000 },
    ],
    duration: "1.5 a 2.5 hs",
    includes: [
      "Aspirado y trapeado",
      "Baños y cocina sanitizados",
      "Cama tendida",
      "Productos incluidos",
    ],
  },
  {
    name: "Profunda",
    badge: "Más reservada",
    featured: true,
    description:
      "Limpieza integral con detalle en juntas, electrodomésticos y rincones olvidados.",
    pricing: [
      { rooms: "1 ambiente", price: 14500 },
      { rooms: "2 ambientes", price: 21000 },
      { rooms: "3+ ambientes", price: 28500 },
    ],
    duration: "3 a 5 hs",
    includes: [
      "Todo lo del plan Express",
      "Interior de horno y heladera",
      "Ventanas y mosquiteros",
      "Pulido de griferías",
      "Sanitización con vapor",
    ],
  },
  {
    name: "Recurrente",
    badge: "Ahorrás hasta 25%",
    description:
      "Plan semanal o quincenal con la misma profesional. Coordinás una vez y listo.",
    pricing: [
      { rooms: "Semanal", price: 7500 },
      { rooms: "Quincenal", price: 9000 },
      { rooms: "Mensual", price: 11500 },
    ],
    duration: "Por visita",
    includes: [
      "Misma profesional cada vez",
      "Prioridad en agenda",
      "Reprogramación gratuita",
      "Descuento de fidelidad",
    ],
  },
];

const TESTIMONIALS = [
  {
    name: "Mariana C.",
    location: "Palermo",
    rating: 5,
    quote:
      "Llegaron puntuales, súper amables y dejaron el departamento impecable. Es la primera vez que confío en un servicio así y voy a repetir sin dudas.",
  },
  {
    name: "Tomás R.",
    location: "Belgrano",
    rating: 5,
    quote:
      "Reservé un sábado por la mañana para una limpieza profunda antes de mudarme. El nivel de detalle fue otro: juntas, cajones, ventanas. 10 puntos.",
  },
  {
    name: "Sofía M.",
    location: "Recoleta",
    rating: 5,
    quote:
      "Tengo el plan recurrente desde hace 4 meses y ya forma parte de mi rutina. Soledad es de confianza, llega siempre con todo lo necesario.",
  },
];

const PROCESS_STEPS = [
  {
    n: "01",
    title: "Elegís y reservás online",
    body:
      "Seleccionás el plan, fecha y dirección. Te mostramos el precio exacto antes de pagar. Sin llamadas ni cotizaciones que demoran.",
  },
  {
    n: "02",
    title: "Asignamos a tu profesional",
    body:
      "Te confirmamos por WhatsApp con el nombre y foto de la persona que va. Todas verificadas, con referencias y seguro.",
  },
  {
    n: "03",
    title: "Disfrutás un hogar impecable",
    body:
      "Llega con productos hipoalergénicos y equipamiento propio. Calificás al final del servicio.",
  },
];

const FAQ = [
  {
    q: "¿Qué zonas de CABA cubren?",
    a: "Trabajamos en todos los barrios de Capital Federal: Palermo, Belgrano, Recoleta, Caballito, Núñez, Villa Crespo, Almagro, Flores, Colegiales, Chacarita, Villa Urquiza, Saavedra y zonas aledañas.",
  },
  {
    q: "¿Las profesionales traen sus productos?",
    a: "Sí. Todos nuestros planes incluyen productos de limpieza profesionales e hipoalergénicos, además del equipamiento (aspiradora, trapos, etc.). Si preferís que usen tus productos, también podemos.",
  },
  {
    q: "¿Puedo no estar en casa durante el servicio?",
    a: "Sí. Coordinamos la entrega y devolución de llaves o el código del portero. Te mandamos fotos antes y después del servicio para que veas el resultado.",
  },
  {
    q: "¿Qué pasa si no quedo conforme?",
    a: "Si dentro de las 24 hs algo no quedó como esperabas, volvemos sin costo. Es nuestra garantía de impecabilidad.",
  },
  {
    q: "¿Cómo se paga?",
    a: "Aceptamos Mercado Pago (tarjeta, débito, QR) y transferencia bancaria. Pagás al confirmar la reserva, no antes ni después.",
  },
];

const BARRIOS = [
  "Palermo",
  "Belgrano",
  "Recoleta",
  "Caballito",
  "Núñez",
  "Villa Crespo",
  "Almagro",
  "Colegiales",
  "Chacarita",
  "Villa Urquiza",
  "Saavedra",
  "Flores",
];

const TRUST_STATS = [
  { value: "+2.400", label: "Hogares atendidos" },
  { value: "4.9 / 5", label: "Calificación promedio" },
  { value: "97%", label: "Vuelven a reservar" },
  { value: "<24 hs", label: "Tiempo de respuesta" },
];

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* ───────────────── HERO ───────────────── */}
        <section className="relative overflow-hidden pt-32 sm:pt-40 pb-20 sm:pb-28">
          {/* Soft texture background */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-background to-background" />
            <div
              className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
              style={{ background: "radial-gradient(circle, #b89968 0%, transparent 70%)" }}
            />
          </div>

          <Container>
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Copy */}
              <div className="lg:col-span-6 xl:col-span-7">
                <Reveal>
                  <Eyebrow>Limpieza premium · CABA</Eyebrow>
                </Reveal>
                <Reveal delay={100}>
                  <h1 className="mt-6 font-serif text-[44px] leading-[1.05] sm:text-6xl lg:text-[68px] tracking-tight text-foreground">
                    Tu hogar,
                    <br />
                    <span className="italic text-brand">
                      impecable
                    </span>{" "}
                    sin levantar un dedo.
                  </h1>
                </Reveal>
                <Reveal delay={200}>
                  <p className="mt-7 max-w-xl text-lg text-muted leading-relaxed">
                    Servicio de limpieza profesional a domicilio en Capital
                    Federal. Profesionales verificadas, productos premium y
                    resultados que se notan apenas abrís la puerta.
                  </p>
                </Reveal>
                <Reveal delay={300}>
                  <div className="mt-9 flex flex-col sm:flex-row gap-3">
                    <Button asChild size="lg">
                      <Link href="/reservar">
                        Reservar mi limpieza
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link href="#precios">Ver precios</Link>
                    </Button>
                  </div>
                </Reveal>

                <Reveal delay={400}>
                  <div className="mt-10 flex items-center gap-6">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className="h-9 w-9 rounded-full border-2 border-background bg-gradient-to-br from-brand-light to-gold-light"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <div className="text-xs leading-relaxed">
                      <div className="flex items-center gap-1 text-gold">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className="h-3.5 w-3.5 fill-current"
                          />
                        ))}
                      </div>
                      <p className="mt-0.5 text-muted">
                        <span className="font-medium text-foreground">
                          4.9 / 5
                        </span>{" "}
                        · +2.400 hogares en CABA
                      </p>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Image */}
              <div className="lg:col-span-6 xl:col-span-5">
                <Reveal delay={200}>
                  <div className="relative aspect-[4/5] sm:aspect-[5/6] overflow-hidden rounded-[28px] shadow-[var(--shadow-lift)]">
                    <Image
                      src={HERO_IMAGE}
                      alt="Living impecable después de servicio ServiYa"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                    {/* Floating quality badge */}
                    <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-background/95 backdrop-blur-sm p-4 shadow-[var(--shadow-card)]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-background">
                          <ShieldCheck className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Garantía 24 hs
                          </p>
                          <p className="text-xs text-muted">
                            Si no quedás conforme, volvemos sin costo.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>

        {/* ───────────────── TRUST STATS ───────────────── */}
        <section className="border-y border-border bg-surface/60">
          <Container>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
              {TRUST_STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={(100 * (i + 1)) as any}>
                  <div className="px-4 sm:px-6 py-8 text-center">
                    <p className="font-serif text-2xl sm:text-3xl text-brand">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                      {stat.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ───────────────── PROCESS ───────────────── */}
        <section id="proceso" className="py-24 sm:py-32">
          <Container>
            <div className="max-w-2xl">
              <Reveal>
                <Eyebrow>Cómo funciona</Eyebrow>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-5 font-serif text-4xl sm:text-5xl tracking-tight text-foreground">
                  Tres pasos.
                  <br />
                  <span className="italic text-brand">Cero fricción.</span>
                </h2>
              </Reveal>
            </div>

            <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
              {PROCESS_STEPS.map((step, i) => (
                <Reveal key={step.n} delay={(100 * (i + 1)) as any}>
                  <div className="relative">
                    <span className="font-serif text-[64px] leading-none text-gold/40">
                      {step.n}
                    </span>
                    <h3 className="mt-4 font-serif text-2xl text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-muted leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ───────────────── PRICING ───────────────── */}
        <section id="precios" className="py-24 sm:py-32 bg-surface/60 border-y border-border">
          <Container>
            <div className="max-w-2xl">
              <Reveal>
                <Eyebrow>Precios</Eyebrow>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-5 font-serif text-4xl sm:text-5xl tracking-tight text-foreground">
                  Precio exacto,
                  <br />
                  <span className="italic text-brand">antes de reservar.</span>
                </h2>
              </Reveal>
              <Reveal delay={200}>
                <p className="mt-5 text-lg text-muted">
                  Sin cotizaciones que demoran. Elegís el plan, la cantidad
                  de ambientes y ves el total final.
                </p>
              </Reveal>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {TIERS.map((tier, i) => (
                <Reveal key={tier.name} delay={(100 * (i + 1)) as any}>
                  <article
                    className={cn_local(
                      "h-full flex flex-col rounded-3xl border p-7 sm:p-8 transition-all duration-300",
                      tier.featured
                        ? "border-brand bg-brand text-background shadow-[var(--shadow-lift)] scale-[1.015]"
                        : "border-border bg-background hover:shadow-[var(--shadow-card)]"
                    )}
                  >
                    <header>
                      <p
                        className={cn_local(
                          "text-[11px] font-medium uppercase tracking-[0.16em]",
                          tier.featured ? "text-gold-soft" : "text-gold"
                        )}
                      >
                        {tier.badge}
                      </p>
                      <h3
                        className={cn_local(
                          "mt-3 font-serif text-3xl tracking-tight",
                          tier.featured ? "text-background" : "text-foreground"
                        )}
                      >
                        {tier.name}
                      </h3>
                      <p
                        className={cn_local(
                          "mt-3 text-sm leading-relaxed",
                          tier.featured ? "text-background/80" : "text-muted"
                        )}
                      >
                        {tier.description}
                      </p>
                    </header>

                    {/* Pricing table */}
                    <div
                      className={cn_local(
                        "mt-6 rounded-2xl border p-4",
                        tier.featured
                          ? "border-background/15 bg-background/5"
                          : "border-border bg-surface/50"
                      )}
                    >
                      {tier.pricing.map((row, idx) => (
                        <div
                          key={row.rooms}
                          className={cn_local(
                            "flex items-baseline justify-between py-2",
                            idx > 0 &&
                              (tier.featured
                                ? "border-t border-background/10"
                                : "border-t border-border")
                          )}
                        >
                          <span
                            className={cn_local(
                              "text-sm",
                              tier.featured ? "text-background/80" : "text-muted"
                            )}
                          >
                            {row.rooms}
                          </span>
                          <span
                            className={cn_local(
                              "font-serif text-xl",
                              tier.featured ? "text-background" : "text-foreground"
                            )}
                          >
                            ${row.price.toLocaleString("es-AR")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      className={cn_local(
                        "mt-5 flex items-center gap-2 text-xs",
                        tier.featured ? "text-background/70" : "text-subtle"
                      )}
                    >
                      <Clock4 className="h-3.5 w-3.5" />
                      Duración estimada: {tier.duration}
                    </div>

                    <ul className="mt-6 space-y-2.5 flex-1">
                      {tier.includes.map((it) => (
                        <li
                          key={it}
                          className={cn_local(
                            "flex items-start gap-2.5 text-sm",
                            tier.featured ? "text-background/90" : "text-foreground"
                          )}
                        >
                          <Check
                            className={cn_local(
                              "mt-0.5 h-4 w-4 shrink-0",
                              tier.featured ? "text-gold-soft" : "text-brand"
                            )}
                          />
                          {it}
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      variant={tier.featured ? "gold" : "outline"}
                      size="md"
                      className="mt-7 w-full"
                    >
                      <Link href="/reservar">
                        Reservar {tier.name}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </article>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ───────────────── ABOUT / VALUE PROP ───────────────── */}
        <section className="py-24 sm:py-32">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <Reveal>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] shadow-[var(--shadow-card)]">
                  <Image
                    src={ABOUT_IMAGE}
                    alt="Detalle de productos de limpieza profesional"
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </Reveal>
              <div>
                <Reveal>
                  <Eyebrow>Nuestra promesa</Eyebrow>
                </Reveal>
                <Reveal delay={100}>
                  <h2 className="mt-5 font-serif text-4xl sm:text-5xl tracking-tight text-foreground">
                    No vendemos limpieza.
                    <br />
                    <span className="italic text-brand">
                      Vendemos tiempo.
                    </span>
                  </h2>
                </Reveal>
                <Reveal delay={200}>
                  <p className="mt-6 text-lg text-muted leading-relaxed">
                    Cada profesional pasa por una entrevista, verificación de
                    antecedentes y capacitación interna. Trabajamos con
                    productos hipoalergénicos, sustentables y seguros para
                    mascotas y chicos.
                  </p>
                </Reveal>

                <Reveal delay={300}>
                  <div className="mt-10 grid grid-cols-2 gap-6">
                    <div className="flex gap-3">
                      <span className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-brand-light text-brand">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          Verificadas
                        </p>
                        <p className="text-sm text-muted">Antecedentes y seguro</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-gold-light text-gold">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          Eco-friendly
                        </p>
                        <p className="text-sm text-muted">Productos sustentables</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-brand-light text-brand">
                        <Clock4 className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">Puntuales</p>
                        <p className="text-sm text-muted">±15 min de la hora pactada</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-gold-light text-gold">
                        <Star className="h-4 w-4 fill-current" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">Garantía</p>
                        <p className="text-sm text-muted">24 hs sin preguntas</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>

        {/* ───────────────── TESTIMONIOS ───────────────── */}
        <section id="opiniones" className="py-24 sm:py-32 bg-surface/60 border-y border-border">
          <Container>
            <div className="max-w-2xl">
              <Reveal>
                <Eyebrow>Opiniones reales</Eyebrow>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-5 font-serif text-4xl sm:text-5xl tracking-tight text-foreground">
                  Lo que dicen
                  <br />
                  <span className="italic text-brand">los hogares de CABA.</span>
                </h2>
              </Reveal>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <Reveal key={t.name} delay={(100 * (i + 1)) as any}>
                  <figure className="h-full flex flex-col rounded-3xl border border-border bg-background p-7 shadow-[var(--shadow-soft)]">
                    <Quote
                      className="h-7 w-7 text-gold"
                      aria-hidden="true"
                    />
                    <blockquote className="mt-4 flex-1 text-foreground leading-relaxed">
                      "{t.quote}"
                    </blockquote>
                    <figcaption className="mt-6 flex items-center justify-between border-t border-border pt-5">
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {t.name}
                        </p>
                        <p className="text-xs text-muted">{t.location}, CABA</p>
                      </div>
                      <div className="flex gap-0.5 text-gold">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3.5 w-3.5 fill-current"
                          />
                        ))}
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ───────────────── BARRIOS ───────────────── */}
        <section className="py-20 sm:py-24">
          <Container>
            <Reveal>
              <div className="text-center max-w-2xl mx-auto">
                <Eyebrow>Cobertura</Eyebrow>
                <h2 className="mt-5 font-serif text-3xl sm:text-4xl tracking-tight text-foreground">
                  Atendemos toda Capital Federal
                </h2>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="mt-10 flex flex-wrap justify-center gap-2.5">
                {BARRIOS.map((b) => (
                  <Link
                    key={b}
                    href={`/servicios/limpieza-de-hogar/${b.toLowerCase().replace(/\s|ú/g, (m) => (m === "ú" ? "u" : "-"))}`}
                    className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground hover:border-brand hover:bg-brand hover:text-background transition-all duration-300"
                  >
                    {b}
                  </Link>
                ))}
              </div>
            </Reveal>
          </Container>
        </section>

        {/* ───────────────── FAQ ───────────────── */}
        <section id="faq" className="py-24 sm:py-32 bg-surface/60 border-t border-border">
          <Container size="narrow">
            <div className="text-center">
              <Reveal>
                <Eyebrow>Preguntas frecuentes</Eyebrow>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-5 font-serif text-4xl sm:text-5xl tracking-tight text-foreground">
                  Todo lo que querés saber.
                </h2>
              </Reveal>
            </div>

            <div className="mt-14 divide-y divide-border border-y border-border">
              {FAQ.map((item, i) => (
                <Reveal key={item.q} delay={(100 * (i + 1)) as any}>
                  <details className="group py-6">
                    <summary className="flex cursor-pointer items-start justify-between gap-6 list-none">
                      <h3 className="font-serif text-xl text-foreground">
                        {item.q}
                      </h3>
                      <span
                        className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-foreground transition-transform duration-300 group-open:rotate-45"
                        aria-hidden="true"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                        >
                          <path
                            d="M5 1V9M1 5H9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-4 text-muted leading-relaxed">
                      {item.a}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ───────────────── FINAL CTA ───────────────── */}
        <section className="py-24 sm:py-32">
          <Container size="narrow">
            <Reveal>
              <div className="relative overflow-hidden rounded-[32px] bg-brand p-10 sm:p-16 text-center text-background shadow-[var(--shadow-lift)]">
                <div
                  className="pointer-events-none absolute -top-20 right-[-10%] h-[300px] w-[300px] rounded-full opacity-20 blur-3xl"
                  style={{ background: "radial-gradient(circle, #cdb38a 0%, transparent 70%)" }}
                  aria-hidden="true"
                />
                <Eyebrow className="text-gold-soft">Hagamos lugar para vos</Eyebrow>
                <h2 className="mt-5 font-serif text-4xl sm:text-5xl tracking-tight">
                  Tu próxima limpieza
                  <br />
                  <span className="italic text-gold-soft">
                    está a 3 minutos de distancia.
                  </span>
                </h2>
                <p className="mt-6 max-w-md mx-auto text-background/80">
                  Elegí día y horario. Te confirmamos por WhatsApp en menos
                  de 5 minutos.
                </p>
                <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild variant="gold" size="lg">
                    <Link href="/reservar">
                      Reservar ahora
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    className="bg-transparent border border-background/30 text-background hover:bg-background/10"
                  >
                    <a
                      href="https://wa.me/5491100000000"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Hablar por WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* Helper local (evita import cycle) */
function cn_local(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

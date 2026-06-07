import type { Metadata } from "next";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Container, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, Check, Star } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

const SERVICES: Record<
  string,
  {
    name: string;
    headline: string;
    description: string;
    basePrice: number;
    image: string;
    includes: string[];
    faqs: { q: string; a: string }[];
    zones: string[];
  }
> = {
  "limpieza-de-hogar": {
    name: "Limpieza de hogar",
    headline: "Limpieza profesional, hogar impecable.",
    description:
      "Servicio integral de limpieza para tu casa o departamento en Capital Federal. Profesionales verificadas, productos premium y atención al detalle.",
    basePrice: 8500,
    image:
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1400&q=80",
    includes: [
      "Aspirado y trapeado de todos los ambientes",
      "Sanitización de baños y cocina",
      "Limpieza de mesadas, espejos y griferías",
      "Productos hipoalergénicos incluidos",
      "Equipamiento profesional",
      "Garantía 24 hs",
    ],
    zones: ["palermo", "belgrano", "recoleta", "caballito", "flores"],
    faqs: [
      {
        q: "¿Cuánto dura una limpieza?",
        a: "Depende del tamaño: 1.5 a 2.5 hs para un mono o 2 ambientes, 3 a 4 hs para 3+ ambientes en plan Express. La Profunda lleva entre 3 y 5 hs.",
      },
      {
        q: "¿Traen productos y aspiradora?",
        a: "Sí, incluímos productos hipoalergénicos profesionales y equipamiento propio. Si preferís que usen los tuyos, también podemos.",
      },
      {
        q: "¿Puedo programar limpieza recurrente?",
        a: "Sí, con el plan Recurrente coordinás semanal, quincenal o mensual con la misma profesional. Pagás menos por visita.",
      },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES[slug];
  if (!service) return { title: "Servicio no encontrado" };

  return {
    title: `${service.name} a domicilio en CABA`,
    description: service.description,
    openGraph: {
      title: `${service.name} · ServiYa`,
      description: service.description,
    },
  };
}

export default async function ServiceLandingPage({ params }: Props) {
  const { slug } = await params;
  const service = SERVICES[slug];
  if (!service) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} a domicilio en CABA`,
    description: service.description,
    provider: {
      "@type": "LocalBusiness",
      name: "ServiYa",
      areaServed: {
        "@type": "Place",
        name: "Capital Federal, Argentina",
      },
      priceRange: "$$",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "240",
      },
    },
    offers: {
      "@type": "Offer",
      price: service.basePrice,
      priceCurrency: "ARS",
      availability: "https://schema.org/InStock",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <Script
        id="json-ld-service"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        id="json-ld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-32 sm:pt-40 pb-20">
          <Container>
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6">
                <Reveal>
                  <Eyebrow>{service.name} · CABA</Eyebrow>
                </Reveal>
                <Reveal delay={100}>
                  <h1 className="mt-6 font-serif text-5xl sm:text-6xl leading-[1.05] tracking-tight text-foreground">
                    {service.headline.split(",")[0]},
                    <br />
                    <span className="italic text-brand">
                      {service.headline.split(",")[1]?.trim()}
                    </span>
                  </h1>
                </Reveal>
                <Reveal delay={200}>
                  <p className="mt-6 text-lg text-muted max-w-xl leading-relaxed">
                    {service.description}
                  </p>
                </Reveal>
                <Reveal delay={300}>
                  <div className="mt-8 flex items-baseline gap-3">
                    <span className="text-sm text-muted">Desde</span>
                    <span className="font-serif text-4xl text-brand">
                      ${service.basePrice.toLocaleString("es-AR")}
                    </span>
                  </div>
                </Reveal>
                <Reveal delay={400}>
                  <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    <Button asChild size="lg">
                      <Link href={`/reservar/${slug}`}>
                        Reservar ahora
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link href="/#precios">Ver todos los planes</Link>
                    </Button>
                  </div>
                </Reveal>
              </div>

              <div className="lg:col-span-6">
                <Reveal delay={200}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] shadow-[var(--shadow-lift)]">
                    <Image
                      src={service.image}
                      alt={`${service.name} · ServiYa`}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>

        {/* Includes */}
        <section className="py-24 bg-surface/60 border-y border-border">
          <Container>
            <div className="grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-4">
                <Reveal>
                  <Eyebrow>Qué incluye</Eyebrow>
                </Reveal>
                <Reveal delay={100}>
                  <h2 className="mt-5 font-serif text-4xl sm:text-5xl tracking-tight text-foreground">
                    Todo lo
                    <br />
                    <span className="italic text-brand">necesario.</span>
                  </h2>
                </Reveal>
              </div>
              <div className="lg:col-span-8">
                <ul className="grid sm:grid-cols-2 gap-4">
                  {service.includes.map((item, i) => (
                    <Reveal key={item} delay={(100 * (i + 1)) as any}>
                      <li className="flex items-start gap-3 rounded-2xl border border-border bg-background p-5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-foreground">{item}</span>
                      </li>
                    </Reveal>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        {/* FAQs */}
        <section className="py-24">
          <Container size="narrow">
            <div className="text-center">
              <Reveal>
                <Eyebrow>Preguntas frecuentes</Eyebrow>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-5 font-serif text-4xl tracking-tight text-foreground">
                  Antes de reservar.
                </h2>
              </Reveal>
            </div>

            <div className="mt-12 divide-y divide-border border-y border-border">
              {service.faqs.map((faq, i) => (
                <Reveal key={faq.q} delay={(100 * (i + 1)) as any}>
                  <details className="group py-6">
                    <summary className="flex cursor-pointer items-start justify-between gap-6 list-none">
                      <h3 className="font-serif text-xl text-foreground">
                        {faq.q}
                      </h3>
                      <span
                        className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-foreground transition-transform duration-300 group-open:rotate-45"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-4 text-muted leading-relaxed">{faq.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Zones */}
        <section className="py-20 bg-surface/60 border-t border-border">
          <Container>
            <Reveal>
              <div className="text-center">
                <Eyebrow>Cobertura</Eyebrow>
                <h2 className="mt-5 font-serif text-3xl text-foreground">
                  Disponible en tu zona
                </h2>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="mt-10 flex flex-wrap justify-center gap-2.5">
                {service.zones.map((zone) => (
                  <Link
                    key={zone}
                    href={`/servicios/${slug}/${zone}`}
                    className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground hover:border-brand hover:bg-brand hover:text-background transition-all duration-300"
                  >
                    {zone.charAt(0).toUpperCase() + zone.slice(1)}
                  </Link>
                ))}
              </div>
            </Reveal>
          </Container>
        </section>

        {/* CTA */}
        <section className="py-24">
          <Container size="narrow">
            <Reveal>
              <div className="rounded-[32px] bg-brand p-12 sm:p-16 text-center text-background">
                <h2 className="font-serif text-4xl tracking-tight">
                  Tu hogar impecable,
                  <br />
                  <span className="italic text-gold-soft">a un clic.</span>
                </h2>
                <Button asChild variant="gold" size="lg" className="mt-8">
                  <Link href={`/reservar/${slug}`}>
                    Reservar ahora <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

export async function generateStaticParams() {
  return Object.keys(SERVICES).map((slug) => ({ slug }));
}

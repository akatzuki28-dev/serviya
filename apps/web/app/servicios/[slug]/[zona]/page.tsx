import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Props {
  params: Promise<{ slug: string; zona: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, zona } = await params;
  const serviceName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const zonaName = zona.charAt(0).toUpperCase() + zona.slice(1);

  return {
    title: `${serviceName} en ${zonaName}, Buenos Aires`,
    description: `Reservá ${serviceName.toLowerCase()} a domicilio en ${zonaName}. Profesionales verificados, precios claros y confirmación inmediata.`,
    openGraph: {
      title: `${serviceName} en ${zonaName} | ServiYa`,
    },
  };
}

export default async function ServiceZonaLandingPage({ params }: Props) {
  const { slug, zona } = await params;

  const serviceName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const zonaName = zona.charAt(0).toUpperCase() + zona.slice(1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `ServiYa — ${serviceName} en ${zonaName}`,
    serviceType: serviceName,
    areaServed: {
      "@type": "Place",
      name: `${zonaName}, Buenos Aires`,
    },
    priceRange: "$$",
    telephone: "+549110000000",
  };

  return (
    <>
      <Script
        id="json-ld-local"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1">
        <section className="bg-white px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold text-foreground">
              {serviceName} en {zonaName}
            </h1>
            <p className="mt-4 text-lg text-muted">
              Encontrá los mejores profesionales de {serviceName.toLowerCase()} cerca de{" "}
              {zonaName}, Buenos Aires. Reservá hoy y confirmación inmediata.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href={`/reservar/${slug}`}>
                Reservar en {zonaName} →
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}

import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui/Container";
import { ServiceSelectorClient } from "./ServiceSelectorClient";

export const metadata: Metadata = {
  title: "Reservar servicio",
  description: "Elegí el servicio que necesitás y reservalo en minutos.",
  robots: { index: false, follow: false },
};

async function getServices() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/services`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ReservarPage() {
  const services = await getServices();

  return (
    <main className="flex-1 py-12 sm:py-16">
      <Container size="default">
        <div className="text-center">
          <Eyebrow>Paso 1 de 3</Eyebrow>
          <h1 className="mt-5 font-serif text-4xl sm:text-5xl tracking-tight text-foreground">
            ¿Qué necesitás
            <br />
            <span className="italic text-brand">para tu hogar?</span>
          </h1>
        </div>
        <div className="mt-12">
          <ServiceSelectorClient services={services} />
        </div>
      </Container>
    </main>
  );
}

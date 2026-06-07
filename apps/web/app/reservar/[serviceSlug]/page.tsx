import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Eyebrow } from "@/components/ui/Container";
import { ScheduleFormClient } from "./ScheduleFormClient";

interface Props {
  params: Promise<{ serviceSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serviceSlug } = await params;
  const name = serviceSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `Reservar ${name}`,
    robots: { index: false, follow: false },
  };
}

async function getAvailability(serviceSlug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/services/${serviceSlug}/availability`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return { slots: [] };
    return res.json();
  } catch {
    return { slots: [] };
  }
}

export default async function SchedulePage({ params }: Props) {
  const { serviceSlug } = await params;
  const { slots } = await getAvailability(serviceSlug);

  return (
    <main className="flex-1 py-12 sm:py-16">
      <Container size="narrow">
        <div className="text-center">
          <Eyebrow>Paso 2 de 3</Eyebrow>
          <h1 className="mt-5 font-serif text-3xl sm:text-4xl tracking-tight text-foreground">
            ¿Cuándo y dónde
            <br />
            <span className="italic text-brand">te visitamos?</span>
          </h1>
        </div>
        <div className="mt-10">
          <ScheduleFormClient serviceSlug={serviceSlug} availableSlots={slots} />
        </div>
      </Container>
    </main>
  );
}

import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui/Container";
import { ConfirmCheckoutClient } from "./ConfirmCheckoutClient";

interface Props {
  params: Promise<{ serviceSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return {
    title: "Confirmar reserva",
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmarPage({ params }: Props) {
  const { serviceSlug } = await params;
  return (
    <main className="flex-1 py-12 sm:py-16">
      <Container size="narrow">
        <div className="text-center">
          <Eyebrow>Paso 3 de 3</Eyebrow>
          <h1 className="mt-5 font-serif text-3xl sm:text-4xl tracking-tight text-foreground">
            Revisá y
            <br />
            <span className="italic text-brand">confirmá tu reserva</span>
          </h1>
        </div>
        <div className="mt-10">
          <ConfirmCheckoutClient serviceSlug={serviceSlug} />
        </div>
      </Container>
    </main>
  );
}

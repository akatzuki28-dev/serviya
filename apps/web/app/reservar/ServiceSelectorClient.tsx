"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ServiceCard, ServiceCardSkeleton } from "@/components/booking/ServiceCard";
import { BookingProgress } from "@/components/booking/BookingProgress";
import { Button } from "@/components/ui/Button";
import { useBookingStore } from "@/store/booking";

interface Service {
  slug: string;
  name: string;
  basePrice: number;
  description?: string;
  category: string;
  comingSoon?: boolean;
}

interface ServiceSelectorClientProps {
  services: Service[];
}

// Fallback data para cuando el API no está disponible
const FALLBACK_SERVICES: Service[] = [
  { slug: "limpieza-de-hogar", name: "Limpieza de hogar", basePrice: 8500, category: "limpieza", description: "Limpieza integral de ambientes" },
  { slug: "plomeria", name: "Plomería", basePrice: 6000, category: "plomeria", description: "Reparaciones y destapaciones", comingSoon: true },
  { slug: "electricidad", name: "Electricidad", basePrice: 5500, category: "electricidad", description: "Instalaciones y reparaciones eléctricas", comingSoon: true },
  { slug: "gasista", name: "Gasista", basePrice: 7000, category: "gasista", description: "Instalaciones y habilitaciones de gas", comingSoon: true },
  { slug: "jardineria", name: "Jardinería", basePrice: 5000, category: "jardineria", description: "Mantenimiento y diseño de jardines", comingSoon: true },
  { slug: "pintura", name: "Pintura", basePrice: 9000, category: "pintura", description: "Pintura de interiores y exteriores", comingSoon: true },
];

export function ServiceSelectorClient({ services }: ServiceSelectorClientProps) {
  const router = useRouter();
  const { setService, serviceSlug } = useBookingStore();
  const [selected, setSelected] = useState<Service | null>(null);

  const displayServices = services.length > 0 ? services : FALLBACK_SERVICES;

  function handleSelect(svc: Service) {
    if (svc.comingSoon) return;
    setSelected(svc);
  }

  function handleContinue() {
    if (!selected) return;
    setService(selected.slug, selected.slug, selected.name);
    router.push(`/reservar/${selected.slug}`);
  }

  return (
    <div className="space-y-6">
      <BookingProgress currentStep={1} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayServices.map((svc) => (
          <ServiceCard
            key={svc.slug}
            service={svc}
            selected={selected?.slug === svc.slug}
            onClick={() => handleSelect(svc)}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!selected}
          onClick={handleContinue}
        >
          Continuar →
        </Button>
      </div>
    </div>
  );
}
